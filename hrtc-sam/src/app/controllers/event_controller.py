import requests
import simplejson as json
from ..models.event_model import EventModel
from ..models.user_model import UserModel
from .. import MyError

def get_events_by_location_status_key(req, location_status_key):
    events = EventModel.get_by_location_status(location_status_key)
    return {'events': [event.data for event in events]}

def get_all_events(req):
    events = EventModel.get_all()
    return {'events': [event.data for event in events]}

def get_event(req, id):
    event = EventModel.get_by_id(id)
    owner = UserModel.get_by_id(event.ownerId)
    data = event.data
    data['owner'] = owner.get_info_data()
    return data
