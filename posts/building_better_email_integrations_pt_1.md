---
Title: Building better email integrations Pt. 1
Date: June 21, 2013
Published: True
---
Building better email integration Pt. 1
=======================================
This is the first part in an on-going series about the email backend in Close.  We'll cover a variety of high and low-level tricks we use to ensure you get the best possible email integration out there.  Shoot us an email (engineering@) if you'd like to have us cover any particular aspects of our email integration.

Per-recipient tracking pixels
-----------------------------
By utilizing SMTPs RCPT TO command, we can send unique message content to each recipient of an email while still having recipients believe they are receiving the same message. Modifying an example from [Wikipedia's SMTP article](http://en.wikipedia.org/wiki/Simple_Mail_Transfer_Protocol#SMTP_transport_example), we can illustrate how this would work in practice:

```text
S: 220 smtp.example.com ESMTP Postfix
C: HELO relay.example.org
S: 250 Hello relay.example.org, I am glad to meet you
C: MAIL FROM:<anthony@close.com>
S: 250 Ok
C: RCPT TO:<alice@example.com>
S: 250 Ok
C: DATA
S: 354 End data with <CR><LF>.<CR><LF>
C: From: "Anthony" <anthony@close.com>
C: To: "Alice" <alice@example.com>, "Bob" <bob@example.com>
C: Date: Thurs, 23 May 2013 16:02:43 -0500
C: Subject: Test message
C:
C: Hello Alice!
C: .
S: 250 Ok: queued as 1234
C: MAIL FROM:<anthony@close.com>
S: 250 Ok
C: RCPT TO:<bob@example.com>
S: 250 Ok
C: DATA
S: 354 End data with <CR><LF>.<CR><LF>
C: From: "Anthony" <anthony@close.com>
C: To: "Alice" <alice@example.com>, "Bob" <bob@example.com>
C: Date: Thurs, 23 May 2013 16:02:43 -0500
C: Subject: Test message
C:
C: Hello Bob!
C: .
S: 250 Ok: queued as 1235
C: QUIT
S: 221 Bye
```

Notice how we're sending 2 different messages (Hello Alice! vs Hello Bob!) with the same To/From/Cc/Date/Subject. This provides the basis to add unique tracking pixel to every email sent and maintain normal email behavior for our senders.

To generate our tracking pixels we encode both the Email.id and email address for every recipient in the TO/CC/BCC of the email. Remember that each recipient should have a different pixel_url.

```python
for recipient in email_to + email_cc + email_bcc:
    pixel_url = "/email_opened/%s/tracking.png" % base64.b64encode(json.dumps({'email_id': 'emai_123ABC', 'email_address': recipient'}))
```

Every time a tracking image URL is requested from an email client, our app responds with the [smallest transparent 1x1 PNG](http://garethrees.org/2007/11/14/pngcrush/) representation and asynchronously creates an EmailOpen(datetime_opened, email_id, email_address) event in our database.

Remove any messages stored by the SMTP server
---------------------------------------------
Google's SMTP servers copy every message sent through their servers into in your Sent Messages directory. Since we've created unique messages for each recipient, we need to delete all of these messages since we don't want our senders to accidentally trigger events by opening sent messages or be confused by multiple copies of the same message appearing in their sent folder.

To find these messages we perform the following search within each of our potential sent message folders via IMAP.

```python
# IMAPClient http://imapclient.readthedocs.org

def imap_search(email):
    query = ' '.join(['HEADER Message-ID %s' % msg_id for msg_id in email.message_ids])
    query = 'OR ' * (len(email.message_ids) - 1) + query
    return imap.search(query)
uids = imap_search(email)
```

We can then search for and set the flags of these messages to Deleted and expunge them from the server. If supporting Gmail, remember deleting messages is a bit different in that you must move a message first to the Trash folder and then delete it. Setting the Deleted flag on a message outside of Trash will be ignored.

```python
if uids:
    """
    Gmail only deletes messages if you move to their
    designated Trash mailbox and then delete.
    """
    if gmail:
        imap.copy(uids, trash_mailbox)
        select_mailbox(imap, trash_mailbox)
        # uids change after a copy to another folder
        uids = imap_search(email)
    imap.delete_messages(uids)
    imap.expunge()

```

Store sent mail using IMAP
-----------------------
When sending email through services like *MailChimp*, *ConstantContact*, or *ToutApp*, you may have been frustrated since sent mail isn't stored in your email account's Sent mail folder -- I know I was. So we made sure your mailbox stays up to date no matter if you're sending emails within Close or not.

If using a service like Gmail which stores all sent messages automatically, we additionally ensure the headers are consistent so scenarios where the FROM header contains ```"anthony@close.com"``` instead of ```"Anthony Nemitz <anthony@close.com>"``` don't occur. This is just another way we try and make your email sending experience as consistent as possible.

So, to grab the original headers from one of our sent messages we use the FETCH command. Note that this operation should be preformed before the messages are deleted (previous section).

```python
"""
Store the original headers so our faked email stored in
the Sent folder looks legit. We only fetch a single UID
(in this case 5899) since the desired headers will be
consistent across copies.
"""
results = imap.fetch([5899], ['BODY.PEEK[HEADER.FIELDS (FROM TO CC BCC)]'])
# the result is something of the form:
# {5899: {'BODY[HEADER.FIELDS (TO CC BCC)]': 'To: alice@example.com, bob@example.com\r\nFrom: Anthony Nemitz <anthony@close.com>\r\n\r\n'}}

# implementation left to the reader
original_headers = fetch_result_to_dict(results)
```

Finally, we append a message constructed from the original text of the Email activity and the FROM/TO/CC/BCC fields of the sent messages we've since deleted (or our Email activity as a fallback).

```python
message = Message(
            email.subject,
            date=calendar.timegm(email.date_created.timetuple()),
            recipients=original_headers.get('To', email.to),
            body=email.body_text,
            html=email.body_html,
            sender=original_headers.get('From', email.sender),
            cc=original_headers.get('Cc', email.cc),
            bcc=original_headers.get('Bcc', email.bcc),
            attachments=[Attachment(
                        filename=att.filename,
                        content_type=att.content_type,
                        data=att.get_data()
                    ) for att in email.attachments])
imap.append(sent_mailbox, message, flags=['\\Seen'], msg_time=email.date_created)
email.message_ids.append(message.msgId)
email.save()
```

-anemitz
