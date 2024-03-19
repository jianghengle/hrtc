import time
import uuid
from .model import Model
from ..services import dynamo_service
from .. import MyError


class ThreadModel(Model):
    TableName = 'HrtcThreads'
    EventIdGSI = ('eventIdGSI', 'eventId')
    EventOwnerIdGSI = ('eventOwnerIdGSI', 'eventOwnerId')
    UserIdGSI = ('userIdGSI', 'userId')
    Fields = ['id', 'eventId', 'eventOwnerId', 'userId', 'chats', 'eventOwnerCount', 'userCount', 'createdAt', 'updatedAt']

    def get_simple_data(self):
        data = self.data
        if (not 'chats' in data) or (not len(data['chats'])):
            return data
        chats = data['chats']
        latest = chats[len(chats) - 1]
        data['chatCount'] = len(chats)
        data['latestChat'] = latest
        del data['chats']
        return data

    @staticmethod
    def get_by_id(id):
        table = dynamo_service.get_table(ThreadModel.TableName)
        item = dynamo_service.get_item(table, 'id', id)
        if item:
            return ThreadModel(item)
        return None
    
    @staticmethod
    def get_threads_by_event_id(event_id):
        table = dynamo_service.get_table(ThreadModel.TableName)
        items = dynamo_service.query(table, ThreadModel.EventIdGSI[0], ThreadModel.EventIdGSI[1], event_id)
        return [ThreadModel(item) for item in items]

    @staticmethod
    def get_threads_by_event_owner_id(event_owner_id):
        table = dynamo_service.get_table(ThreadModel.TableName)
        items = dynamo_service.query(table, ThreadModel.EventOwnerIdGSI[0], ThreadModel.EventOwnerIdGSI[1], event_owner_id)
        return [ThreadModel(item) for item in items]

    @staticmethod
    def get_threads_by_user_id(user_id):
        table = dynamo_service.get_table(ThreadModel.TableName)
        items = dynamo_service.query(table, ThreadModel.UserIdGSI[0], ThreadModel.UserIdGSI[1], user_id)
        return [ThreadModel(item) for item in items]

    @staticmethod
    def create_thread(event, user, chat):
        table = dynamo_service.get_table(ThreadModel.TableName)
        id = str(uuid.uuid4())
        timestamp = int(time.time()*1000)
        data = {
            'id': id,
            'eventId': event.id,
            'eventOwnerId': event.ownerId,
            'userId': user.id,
            'chats': [chat],
            'eventOwnerCount': 0,
            'userCount': 0,
            'createdAt': timestamp,
            'updatedAt': timestamp,
        }
        dynamo_service.create_item(table, data, 'id')
        return id

    @staticmethod
    def append_chat(thread_id, chat):
        table = dynamo_service.get_table(ThreadModel.TableName)
        updates = {'updatedAt': int(time.time()*1000)}
        appends = {'chats': [chat]}
        dynamo_service.update_item(table, 'id', thread_id, updates, appends)

    @staticmethod
    def update_count(thread, user):
        table = dynamo_service.get_table(ThreadModel.TableName)
        id = thread.id
        data = {}
        if user.id == thread.eventOwnerId:
            if thread.eventOwnerCount < len(thread.chats):
                data['eventOwnerCount'] = len(thread.chats)
                dynamo_service.update_item(table, 'id', id, data)
        if user.id == thread.userId:
            data['userCount'] = len(thread.chats)
            if thread.userCount < len(thread.chats):
                data['userCount'] = len(thread.chats)
                dynamo_service.update_item(table, 'id', id, data)
