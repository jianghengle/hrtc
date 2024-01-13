import bcrypt
import string
import secrets
import time
import uuid
from .model import Model
from ..services import dynamo_service
from .. import MyError

DEFAULT_NICKNAME = '微信用户'
DEFAULT_AVATAR_URL = 'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6icRiccVGKSyXwibcPq4BWmiaIGuG1icwxaQX6grC9VemZoJ8rg/132'


class UserModel(Model):
    TableName = 'HrtcUsers'
    TokenGSI = ('tokenGSI', 'token')
    OpenidGSI = ('openidGSI', 'openid')
    Fields = ['id', 'openid', 'nickname', 'avatar', 'token', 'createdAt', 'updatedAt', 'lastLoginAt']

    def get_info_data(self):
        return {
            'id': self.id,
            'nickname': self.nickname,
            'avatar': self.avatar,
            'nicknameNotSet': self.nickname == DEFAULT_NICKNAME 
        }
    
    def update_user(self, data):
        table = dynamo_service.get_table(UserModel.TableName)
        dynamo_service.update_item(table, 'id', self.id, data)
        return UserModel(dynamo_service.get_item(table, 'id', self.id))

    @staticmethod
    def get_by_token(token):
        if not token:
            raise MyError('No token')
        table = dynamo_service.get_table(UserModel.TableName)
        items = dynamo_service.query(table, UserModel.TokenGSI[0], UserModel.TokenGSI[1], token)
        if not len(items):
            return None
        if len(items) > 1:
            raise MyError('Found multiple users with same token')
        return UserModel(items[0])

    @staticmethod
    def get_by_openid(openid):
        if not openid:
            raise MyError('No openid')
        table = dynamo_service.get_table(UserModel.TableName)
        items = dynamo_service.query(table, UserModel.OpenidGSI[0], UserModel.OpenidGSI[1], openid)
        if not len(items):
            return None
        if len(items) > 1:
            raise MyError('Found multiple users with same openid')
        return UserModel(items[0])

    @staticmethod
    def create_by_openid(openid):
        table = dynamo_service.get_table(UserModel.TableName)
        id = str(uuid.uuid4())
        alphabet = string.ascii_letters + string.digits
        token = ''.join(secrets.choice(alphabet) for i in range(64))
        timestamp = int(time.time()*1000)
        data = {
            'id': id,
            'openid': openid,
            'nickname': DEFAULT_NICKNAME,
            'avatar': {
                'source': 'url',
                'url': DEFAULT_AVATAR_URL,
            },
            'token': token,
            'createdAt': timestamp,
            'updatedAt': timestamp,
            'lastLoginAt': timestamp,
        }
        dynamo_service.create_item(table, data, 'id')
        item = dynamo_service.get_item(table, 'id', id)
        return UserModel(item)