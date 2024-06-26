import os
import requests
import simplejson as json
from ..models.user_model import UserModel
from ..models.event_model import EventModel
from .. import MyError


def ping(req):
    if req.queryStringParameters and 'token' in req.queryStringParameters:
        token = req.queryStringParameters['token']
        user = UserModel.get_by_token(token)
        if user:
            return {'user': {'id': user.id}}
        return {'user': None}
    return {'pinged': True}

def wx_login(req):
    params = {
        'appid':  os.environ['WX_APP_ID'],
        'secret': os.environ['WX_APP_SECRET'],
        'js_code': req.body['code'],
        'grant_type': 'authorization_code', 
    }
    r = requests.get('https://api.weixin.qq.com/sns/jscode2session', params=params)
    openid = json.loads(r.text)['openid']
    user = UserModel.get_by_openid(openid)
    event_id = req.body.get('query', {}).get('currentEventId', None)
    event = EventModel.get_by_id(event_id) if event_id else None
    if not user:
        user = UserModel.create_by_openid(openid, event)
    elif event:
        user = UserModel.check_to_update_location(user, event)
    user_data = user.get_info_data()
    user_data['token'] = user.token
    return user_data

def update(req):
    user = req.user
    user = user.update_user(req.body)
    return user.get_info_data()

def get_user_info(req, id):
    user = UserModel.get_by_id(id)
    return user.get_info_data()
