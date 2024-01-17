import os, random, string
from ..services.s3_service import create_presigned_post, create_presigned_url

S3_BUCKET = 'hrtc-s3-bucket'

def get_s3_upload_url(req):
    filename = req.body['filename']
    key = 'uploaded_files/' + req.user.id + '/' + get_random_string(8) + '/' + filename
    url = create_presigned_post(S3_BUCKET, key)
    url['bucket'] = S3_BUCKET
    url['key'] = key
    return url

def get_s3_download_url(req):
    key = req.body['key']
    url = create_presigned_url(S3_BUCKET, key)
    return {'url': url, 'key': key}

def get_random_string(n):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=n))
