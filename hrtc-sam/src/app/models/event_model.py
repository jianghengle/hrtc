import time
import uuid
from .model import Model
from ..services import dynamo_service
from .. import MyError


class EventModel(Model):
    TableName = 'HrtcEvents'
    OwnerIdGSI = ('ownerIdGSI', 'ownerId')
    LocationStatusKeyGSI = ('locationStatusKeyGSI', 'locationStatusKey')
    Fields = ['id', 'ownerId', 'eventType', 'status', 'title', 'description', 'items', 'location', 'locationStatusKey', 'createdAt', 'updatedAt', 'openedAt', 'views', 'threadsCount']

    @staticmethod
    def get_the_three_events():
        event_ids = [
            '58f8582d-ad3b-4624-b707-a9fe9f280ad1',
            '3e1beadd-7d94-4914-a10e-b85823fe36c2',
            '6b5962dc-a2fb-4431-a9f1-58e23d9d0058',
        ]
        return [EventModel.get_by_id(event_id) for event_id in event_ids]

    @staticmethod
    def get_by_location_status(locationStatusKey):
        table = dynamo_service.get_table(EventModel.TableName)
        items = dynamo_service.query(table, EventModel.LocationStatusKeyGSI[0], EventModel.LocationStatusKeyGSI[1], locationStatusKey)
        return [EventModel(item) for item in items]

    @staticmethod
    def get_by_owner_id(ownerId):
        table = dynamo_service.get_table(EventModel.TableName)
        items = dynamo_service.query(table, EventModel.OwnerIdGSI[0], EventModel.OwnerIdGSI[1], ownerId)
        return [EventModel(item) for item in items]

    @staticmethod
    def get_all():
        table = dynamo_service.get_table(EventModel.TableName)
        items = dynamo_service.scan(table)
        return [EventModel(item) for item in items]

    @staticmethod
    def get_by_id(id):
        table = dynamo_service.get_table(EventModel.TableName)
        item = dynamo_service.get_item(table, 'id', id)
        if item:
            return EventModel(item)
        return None

    @staticmethod
    def create(data):
        table = dynamo_service.get_table(EventModel.TableName)
        id = str(uuid.uuid4())
        data['id'] = id
        timestamp = int(time.time()*1000)
        data['createdAt'] = timestamp
        data['openedAt'] = timestamp
        data['updatedAt'] = timestamp
        data['locationStatusKey'] = make_location_status_key(data['location'], data['status'])
        dynamo_service.create_item(table, data, 'id')
        item = dynamo_service.get_item(table, 'id', id)
        return EventModel(item)

    @staticmethod
    def update(event, data):
        table = dynamo_service.get_table(EventModel.TableName)
        id = data['id']
        del data['id']
        timestamp = int(time.time()*1000)
        data['updatedAt'] = timestamp
        if event.status != 'open' and data['status'] == 'open':
            data['openedAt'] = timestamp
        data['locationStatusKey'] = make_location_status_key(data['location'], data['status'])
        dynamo_service.update_item(table, 'id', id, data)
        item = dynamo_service.get_item(table, 'id', id)
        return EventModel(item)
    
    @staticmethod
    def update_views(event, views):
        table = dynamo_service.get_table(EventModel.TableName)
        id = event.id
        data = {'views': views}
        dynamo_service.update_item(table, 'id', id, data)
        item = dynamo_service.get_item(table, 'id', id)
        return EventModel(item)

    @staticmethod
    def update_threads_count(event, threads_count):
        table = dynamo_service.get_table(EventModel.TableName)
        id = event.id
        data = {'threadsCount': threads_count}
        dynamo_service.update_item(table, 'id', id, data)
        item = dynamo_service.get_item(table, 'id', id)
        return EventModel(item)

    @staticmethod
    def mark_deleted(event):
        table = dynamo_service.get_table(EventModel.TableName)
        id = event.id
        data = {
            'ownerId': event.ownerId + '_deleted',
            'status': 'deleted',
            'locationStatusKey': 'deleted',
        }
        timestamp = int(time.time()*1000)
        data['updatedAt'] = timestamp
        dynamo_service.update_item(table, 'id', id, data)


def make_location_status_key(location, status):
    lat = decimal_to_int_str(location['latitude'])
    lng = decimal_to_int_str(location['longitude'])
    return lat + '_' + lng + '_' + status


def decimal_to_int_str(d):
    ss = str(d).split('.')
    return ss[0]

