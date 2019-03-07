hack.close.com
==============

1. Make a post in Markdown and put it in posts/
2. Run `python blog.py`
3. The files will be in `../public_html`, ready to view on the interwebs.
4. To sync files to the cloud, make sure you have your own AWS credentials in
   `~/.aws/config` under `[profile closeio]`, and then run `./sync_s3.sh`.


Simple, right?
