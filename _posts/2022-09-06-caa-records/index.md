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

In a nutshell it is a standard that is described in the following [RFC 8659](https://www.rfc-editor.org/rfc/rfc8659) that allows a DNS domain name holder to add Certificates Authorities (CA) that are authorized to issue a TLS certificate for the given domain name.  

Basically speaking you add a CAA records that indicates who is allowed to issue a TLS certificate for your domain. For example if you use Let's Encrypt so you add CAA records for the domain that says, Lets Encrypt is allowed to issue certificates for that domain. If another CA is going to issue a certificate for the domain name, the certificates will not be issued. It is simple to implement and it adds some security. We should definitely consider adding it and reduce the risk of CA breaches. 

The major benefit of using CAA records is that it happened before issuing a certificate, it should prevent potential breach. There are other available options to prevent that but it happened **after** the effect when someone already issued a certificate from a non authorized CA. The breach already happened. This might be done by using HTTP Public Key Pinning and additional HTTP headers - it is in the client and it was after the effect. If a CA was compromised and they issue a certificate for your domain and if you did HTTP public key pinning the browser should have ignored it.

## What is the motivation behind this standard?

Technically speaking, breaches in CA could happen, so if you add those records it prevents miss-issuance of a certificate. The validation process happens **before** the issuing happens. If someone is trying to issue a certificate from the CA that is not listed in CAA resource records it should not be allowed to issue a certificate for that particular domain name. CAA will check if the CAA record is created and if it matches CA name than certificate should be issued, otherwise it should be denied. You may also be notified about that attempt, however it is not obligatory and it depends on the CA configuration. 

## How that process works?

If the CA is requested to issue certificate for the given domain name it will first check if the CAA records exists. If that CA is listed in a specific property tags such as `issue` or `issuewild` the process should be continued. Please note that CAA records are not mandatory, so if you didn’t specify them, the certificate should still be issued. 

Once you create a CAA records to authorize one of the existing CA e.g. Let’s Encrypt you explicitly exclude other CA from issuing a certificate for that domain. However, you can add another CAA record and add other CA’s if it is needed. 

The entire configuration is hierarchical, so we can create CAA records for entire domain `example.com` or for a specific domain, e.g. `blog.example.com`. However, a good practice is to create a CAA record on a root domain and that record will be inherited to other subdomains. 

This is exactly what we have done at Close. We have created a CAA records for `close.com` to allow a specific CA to issue TLS certificate for root domain and then explicitly created additional records for e.g. `blog.close.com` and add here other CA for that specific subdomain. 

## What property tags are available? 

### CAA issue property

The `issue` - use this property tag to authorize a specific CA to issue certificates for that domain, e.g.

```bash
certs.close.com     CAA 0  issue “letsencrypt.com”
certs.close.com     CAA 0  issue “digicert.com”
```

That means that for the FQDN `certs.close.com` there are two CA’a allowed to issue certificate `letsencrypt.com` and `digicert.com`.

### CAA issuewild property

The `issuewild` - that property has the same syntax as the mentioned earlier `issue` tag. However it only grants authorization to issue wildcard certificates. According to the RFC 8659 it takes precedence over each `issue` property already defined. Let’s have a look at that example:

```bash
wild.close.com     CAA 0 issue “comodaca.com”
wild.close.com     CAA 0 issuewild “letsencrypt.com”
```

In that case `comodoca.com` is the only CA which can issue certificates for the FQDN `wild.close.com` and `sub.wild.close.com`, and only `letsencrypt.com` can issue certificates `*.wild.close.com` and `*.sub.wild.close.com.`. Please note that there are no CAA records created for `sub.wild.close.com.`

Let’s consider another example: 

```bash
wild2.close.com     CAA 0 issuewild “sectigo.com”
```

It allows to request TLS certificates for `wild2.example.com` and for `*.wild2.close.com` as well ass for `*.sub.wild2.close.com`.

The important thing concerning `issuewild` that it add additional restriction on top of `issue`. If you provide the`issue` property tag and you do not specify `issuwild` allows both wildcard and non-wildcard certificates. 

Quotting [Jacob Hoffman-Andrews](https://www.eff.org/about/staff/jacob-hoffman-andrews) - one of the author of the RFC 8659: 
> "Providing an `issuewild` record on top of an `issue` record provides further restriction. For instance you might allow 5 CAs to issue for your domain and subdomains in general, but restrict wildcard issuance to only 1 CA (for instance if that CA has stronger validation procedures for wildcard certificates). Or you might say `issuewild ";"` to indicate you do not want any wildcard issuance from any CA."

It means that for the most cases, even if we issue wildcard certificates, we don't need to worry about `issuewild` property tag because the entire configuration will be achieved by `issue`.

### CAA iodef property

The `iodef ` - specify a URL or email address to which a certificate authority [may](https://www.rfc-editor.org/rfc/rfc2119#section-5)] report policy violations. The verb may is crucial here, it does not mean that you will be notified in case of violations, it strictly depends on the CA and its configuration.

```bash
report.close.com    CAA 0  iodef "mailto:security@close.com"
```

There are a hundred of certificate authorities available. You can use the following [website](https://sslmate.com/caa/) to find out what exactly records should be added for the particular CA you would like to whitelist to issue certificates for your domain. 

## What about CNAME records?

This a little bit tricky, since we can not create CNAME records that coexists with other data, in that case CAA records. This is common mistake while configuring DNS records to create additional data for CNAME, see [RFC 1912](https://www.ietf.org/rfc/rfc1912.txt) for more details. 

While working with CNAME records, while verifuing CAA records, a certificate authority looks for CAA records set at the CNAME target. If there is no CAA record found, the certificate authority continues searching on parent domain of the original domain. 

Let's have a look on that example. If we have a record `blog.close.com`, that is a CNAME to `close.ghost.io`, then the CA looks for records sets in the following order. 

- close.ghost.io
- close.com

## Key takeaways

- CAA records are not mandatory, they can be added to increase security and prevent potential CA breaches.
- If there are no CAA records added, it means that all CA can issue TLS certificates for that domain name. 
- Once a CAA record is created with property `issue` or `issuewild` is added pointing to the one of CA that means, that only that CA can issue a certificate.
- You can publish multiple properties for that same domain name by adding multiple CAA resource records, they are additive. 
- Adding those records increases the website security but still your website should be built based on best security practices e.g. [OWASP Top Ten](https://owasp.org/www-project-top-ten/)
- It is not possible that a domain name has both CNAME and a CAA record. 

Should you have any questions concerning that topic? Or you are just curious about working at Close - please feel free to reach me on Twitter [@_jakubhajek](https://twitter.com/_jakubhajek). 