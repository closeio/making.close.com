export AWS_DEFAULT_PROFILE=closeio
export AWS_DEFAULT_REGION=us-west-2

BUCKET=hack.close.com

aws s3 sync ../public_html/posts s3://$BUCKET/posts \
    --content-type text/html \
    --exclude '.*' --exclude '*/.*' \
    --delete

aws s3 sync ../public_html s3://$BUCKET/ \
    --exclude '.*' --exclude '*/.*' --exclude 'posts/*' \
    --delete
