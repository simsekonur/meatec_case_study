#!/bin/bash
# init-localstack.sh
# Creates the S3 bucket in LocalStack on first startup.
# This script is run by the LocalStack init hook.

awslocal s3 mb s3://meatec-documents --region us-east-1
echo "✅  LocalStack: S3 bucket 'meatec-documents' created"
