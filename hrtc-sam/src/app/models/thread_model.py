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
    Fields = ['id', 'eventId', 'eventOwnerId', 'userId', 'orderedItems', 'historyOrders', 'chats', 'note', 'eventOwnerCount', 'userCount', 'createdAt', 'updatedAt']

    def get_simple_data(self, event=None):
        data = self.data
        if data['orderedItems'] and event:
            data['orderedItems'] = filter_ordered_items(event, data['orderedItems'])
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
    def create_thread(event, user, chat=None):
        table = dynamo_service.get_table(ThreadModel.TableName)
        id = str(uuid.uuid4())
        timestamp = int(time.time()*1000)
        chats = [chat] if chat else []
        data = {
            'id': id,
            'eventId': event.id,
            'eventOwnerId': event.ownerId,
            'userId': user.id,
            'chats': chats,
            'orderedItems': [],
            'note': '',
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

    @staticmethod
    def mark_deleted_for_event(event):
        threads = ThreadModel.get_threads_by_event_id(event.id)
        table = dynamo_service.get_table(ThreadModel.TableName)
        timestamp = int(time.time()*1000)
        for thread in threads:
            data = {
                'eventOwnerId': thread.eventOwnerId + '_deleted',
                'userId': thread.userId + '_deleted',
                'updatedAt': timestamp
            }
            dynamo_service.update_item(table, 'id', thread.id, data)

    @staticmethod
    def update_note(thread, note):
        table = dynamo_service.get_table(ThreadModel.TableName)
        data = {'note': note}
        dynamo_service.update_item(table, 'id', thread.id, data)

    @staticmethod
    def update_order(user, event, thread_id, ordered_items):
        thread = ThreadModel.get_by_id(thread_id)
        table = dynamo_service.get_table(ThreadModel.TableName)
        timestamp = int(time.time()*1000)
        filtered_ordered_items = filter_ordered_items(event, ordered_items, with_min_buy=False)
        updates = {
            'orderedItems': filtered_ordered_items,
            'updatedAt': timestamp
        }
        chat = {
            'type': 'text',
            'content': make_order_summary(filtered_ordered_items),
            'timestamp': timestamp,
            'userId': user.id,
        }
        appends = {'chats': [chat]}
        dynamo_service.update_item(table, 'id', thread_id, updates, appends)
        return ThreadModel.get_by_id(thread_id)

    @staticmethod
    def archive_order(user, event, thread):
        table = dynamo_service.get_table(ThreadModel.TableName)
        timestamp = int(time.time()*1000)
        history_order = make_history_order(user, event, thread, timestamp)
        chat = {
            'type': 'text',
            'content': '订单已归档',
            'timestamp': timestamp,
            'userId': user.id,
        }
        updates = {
            'orderedItems': [],
            'note': '',
            'updatedAt': timestamp
        }
        appends = {'chats': [chat], 'historyOrders': [history_order]}
        if not thread.historyOrders:
            updates['historyOrders'] = [history_order]
            appends = {'chats': [chat]}
        dynamo_service.update_item(table, 'id', thread.id, updates, appends)


def make_history_order(user, event, thread, timestamp):
    items = filter_ordered_items(event, thread.orderedItems, with_min_buy=False)
    return {
        'event': event.title,
        'archivedBy': user.id,
        'note': thread.note,
        'timestamp': timestamp,
        'items': items,
    }


def filter_ordered_items(event, ordered_items, with_min_buy=True):
    ordered_item_map = {}
    for ordered_item in ordered_items:
        ordered_item_map[ordered_item['itemId']] = ordered_item
    filtered_items = []
    for item in event.items:
        if not item.get('price', None):
            continue
        ordered_item = ordered_item_map.get(item['id'], None)
        if ordered_item and ordered_item['quantity']:
            ordered_item['title'] = item['title']
            ordered_item['price'] = item['price']
            if with_min_buy:
                ordered_item['minBuy'] = item.get('minBuy', 1)
            filtered_items.append(ordered_item)
    return filtered_items


def make_order_summary(ordered_items):
    if not len(ordered_items):
        return '订单更新：（清空）'
    lines = ['订单更新：']
    for ordered_item in ordered_items:
        line = ordered_item.get('title', ordered_item['itemId'])
        line = line + ' / $' + ordered_item['price']
        line = line +  ' ： ' + str(ordered_item['quantity'])
        lines.append(line)
    return '\n'.join(lines)
