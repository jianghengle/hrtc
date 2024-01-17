import time
from .model import Model
from ..services import dynamo_service
from .. import MyError


class EventModel(Model):
    TableName = 'HrtcEvents'
    OwnerIdGSI = ('ownerIdGSI', 'ownerId')
    LocationStatusKeyGSI = ('locationStatusKeyGSI', 'locationStatusKey')
    Fields = ['id', 'ownerId', 'eventType', 'status', 'title', 'description', 'items', 'location', 'locationStatusKey', 'createdAt', 'updatedAt', 'openedAt', 'views']

    @staticmethod
    def get_by_location_status(locationStatusKey):
        table = dynamo_service.get_table(EventModel.TableName)
        items = dynamo_service.query(table, EventModel.LocationStatusKeyGSI[0], EventModel.LocationStatusKeyGSI[1], locationStatusKey)
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
