#!/bin/bash
# This script runs automatically inside LocalStack on startup
# It creates the S3 bucket needed by document-service

awslocal s3 mb s3://meatec-documents --region us-east-1
echo "✅ S3 bucket 'meatec-documents' created"
