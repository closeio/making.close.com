---
layout: post
title: 'DNS Certification Authority Authorization CAA records'
date: 2022-09-07
permalink: /posts/caa-records
author: Jakub Hajek
thumbnail: ''
metaDescription: ''
tags: [Engineering, Security, DNS]
---

## What are CAA resource records?

In a nutshell, CAA Records are a standard that is described in [RFC 8659](https://www.rfc-editor.org/rfc/rfc8659) that allows a DNS domain name holder to specify which Certificate Authorities (CA) are authorized to issue a TLS certificate for the given domain name.  

Basically speaking you add CAA records to restrict who is allowed to issue a TLS certificate for your domain. For example, if you use Let's Encrypt you can add CAA records such that Let's Encrypt is the only CA allowed to issue certificates for your domain. If another CA tries to issue a certificate for the domain name, the certificate will not be issued. It is simple to implement and it reduces the risk of mis-issuance of a certificate.

The major benefit of using CAA records is that it happens **before** issuing a certificate. Other options detect mis-issuance **after** someone has already issued a certificate from an unauthorized CA. 

## What is the motivation behind this standard?

Technically speaking, the CAA record reduces the risk of certificate mis-issuance. The validation process happens **before** the issuing happens. If someone is trying to issue a certificate from the CA that is not listed in CAA resource records the CA should not issue a certificate for that domain name. You may also be notified about that attempt. However, it is not obligatory and it depends on the CA configuration. 

However, the standard does not prevent reliance on a certificate that has been miss-issued. That is a separate subject offered a mechanism avoiding reliance on mis-issued certificates called DANE and described in the [RFC 6698](https://www.rfc-editor.org/info/rfc6698).

## How does that process work?

If the CA is requested to issue a certificate for the given domain name it will first check if the CAA records exist. If that CA is listed in specific property tags such as `issue` or `issuewild` the process should be continued. Please note that CAA records are optional. If you have no CAA records any CA can issue any certificate for your domain. However, if any CAA records exist for your domain a compliant CA will not issue your cert unless a CAA record allows it exists.

Once you create CAA records to authorize one of the existing CA e.g. Let’s Encrypt you explicitly exclude other CA from issuing a certificate for that domain. However, you can add another CAA record and add other CA’s if it is needed. 

The entire configuration is hierarchical, so we can create CAA records for entire the domain `example.com` or for a specific subdomain, e.g. `blog.example.com`. However, a good practice is to create a CAA record on a root domain and that record will be inherited by other subdomains. 

This is exactly what we have done at Close. We have created CAA records for `close.com` to allow a specific CA to issue a TLS certificate for the root domain and then explicitly created additional records for e.g. `blog.close.com` to allow a different CA to issue certificates for that specific domain. 

## What property tags are available? 

### CAA `issue` property

The `issue` - use this property tag to authorize a specific CA to issue certificates for that domain, e.g.

```bash
certs.close.com     CAA 0  issue “letsencrypt.com”
certs.close.com     CAA 0  issue “digicert.com”
```

That means that for the FQDN `certs.close.com` there are two CA’a allowed to issue certificate `letsencrypt.com` and `digicert.com`.

### CAA `issuewild` property

The `issuewild` - that property has the same syntax as the mentioned earlier `issue` tag. However, it only grants authorization to issue wildcard certificates. According to the RFC 8659 it takes precedence over each `issue` property already defined. Let’s have a look at that example:

```bash
wild.close.com     CAA 0 issue “comodaca.com”
wild.close.com     CAA 0 issuewild “letsencrypt.com”
```

In that case, `comodoca.com` is the only CA that can issue certificates for the FQDN `wild.close.com` and `sub.wild.close.com`, and only `letsencrypt.com` can issue certificates `*.wild.close.com` and `*.sub.wild.close.com.`. Please note that there are no CAA records created for `sub.wild.close.com.`

Let’s consider another example: 

```bash
wild2.close.com     CAA 0 issuewild “sectigo.com”
```

The above allows Sectigo to issue certificates for `wild2.example.com` and for `*.wild2.close.com` as well as for `*.sub.wild2.close.com`.

The important thing concerning `issuewild` is that it adds an additional restriction on top of `issue`. If you provide the `issue` property tag and you do not specify `issuwild` both wildcard and non-wildcard certificates may be issued.

Quoting [Jacob Hoffman-Andrews](https://www.eff.org/about/staff/jacob-hoffman-andrews) - one of the authors of the RFC 8659: 
> "Providing an `issuewild` record on top of an `issue` record provides further restriction. For instance, you might allow 5 CAs to issue for your domain and subdomains in general, but restrict wildcard issuance to only 1 CA (for instance if that CA has stronger validation procedures for wildcard certificates). Or you might say `issuewild ";"` to indicate you do not want any wildcard issuance from any CA."

It means that in most cases, even if we issue wildcard certificate, we don't need to worry about `issuewild` property tag because the entire configuration will be achieved by `issue`.

### CAA `iodef` property

The `iodef ` - specify a URL or email address to which certificate authority [may](https://www.rfc-editor.org/rfc/rfc2119#section-5) report policy violations. The verb may is crucial here, it does not mean that you will be notified in case of violations, it strictly depends on the CA and its configuration.

```bash
report.close.com    CAA 0  iodef "mailto:security@close.com"
```


## What about CNAME records?

This is a little bit tricky since we can not create CNAME records that coexist with other data, in that case, CAA records. This is a common mistake while configuring DNS records to create additional data for CNAME, see [RFC 1912](https://www.ietf.org/rfc/rfc1912.txt) for more details. 

While working with CNAME records, while verifying CAA records, a certificate authority looks for CAA records set at the CNAME target. If there is no CAA record found, the certificate authority continues searching on the parent domain of the original domain. 

Let's have a look at that example. If we have a record `blog.close.com`, which is a CNAME to `close.ghost.io`, then the CA looks for records sets in the following order. 

- close.ghost.io
- close.com


## How we approached implementing CAA records

Our process for implementing CAA records for our domain was quite straightforward. We have to get a list of all A records created for our domain and then identify the issuer for the subdomain. Since we use AWS Route53 as a DNS server we can use AWS CLI to get list records that are needed:

```bash
aws route53 list-resource-record-sets --hosted-zone-id <ZONE_ID> \
    | jq '.ResourceRecordSets[] | "\(.Name) \(.Type)"' \
    | awk '{if ($2 ~ /A/) print substr($1,2)}'
```

Once we have an output of that command stored in the text file we can use `openssl` command to iterate over all subdomains and identify the issuer of the certificate.

```bash
gtimeout 3 openssl s_client -showcerts -partial_chain \
    -connect ${subdomain}:443 <<< "Q" 2>/dev/null \
    | openssl x509  -noout -issuer | tr -d '\n' >> ${F} 
```

There are a hundred certificate authorities available. Since having a list of Certificate Authorities used in the zone, we use as a reference the following [website](https://sslmate.com/caa/) to find out what exactly records should be added for the particular CA you would like to whitelist to issue certificates for your domain. 

## Key takeaways

- CAA records are not mandatory, they can be added to increase security and prevent potential CA breaches.
- If there are no CAA records added, it means that any CA can issue TLS certificates for that domain name. 
- Once a CAA record is created with a property `issue` or `issuewild` for a domain, only the indicated CA can issue certificates for that domain.
- You can publish multiple properties for that same domain name by adding multiple CAA resource records, they are additive. 
- Adding those records increases the website security but still, your website should be built based on best security practices e.g. [OWASP Top Ten](https://owasp.org/www-project-top-ten/)
- It is not possible that a domain name has both a CNAME and a CAA record. 

Should you have any questions concerning that topic? If you are just curious about working at Close - please feel free to reach me on Twitter [@_jakubhajek](https://twitter.com/_jakubhajek). 