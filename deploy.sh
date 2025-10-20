#!/bin/bash

#
# Deploy to AWS
#

aws s3 sync . s3://maps.stamen.com-site --exclude=".git/*" --exclude=".github/*" --exclude="*.sh" --exclude=".gitignore"
aws cloudfront create-invalidation --distribution-id E31F04I4T5ZW1U --paths '/*'
