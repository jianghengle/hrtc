import requests
import simplejson as json
from ..models.event_model import EventModel
from ..models.user_model import UserModel
from ..models.thread_model import ThreadModel
from .. import MyError

def get_events_by_location_status_key(req, key):
    if req.user.isolated:
        events = EventModel.get_the_three_events()
    else:
        events = EventModel.get_by_location_status(key)
    return {'events': [event.data for event in events]}

def get_owned_events(req):
    user = req.user
    events = EventModel.get_by_owner_id(user.id)
    return {'events': [event.data for event in events]}

def get_all_events(req):
    events = EventModel.get_all()
    return {'events': [event.data for event in events]}

def get_event(req, id):
    user = req.user
    event = EventModel.get_by_id(id)
    views = event.views
    if not views:
        views = []
    if user.id not in views:
        event = EventModel.update_views(event, views + [user.id])
    owner = UserModel.get_by_id(event.ownerId)
    data = event.data
    data['owner'] = owner.get_info_data()
    return data

def get_event_timestamp(req, id):
    event = EventModel.get_by_id(id)
    timestamp = None
    if event:
        timestamp = event.updatedAt
    return {'timestamp': timestamp}

def create_event(req):
    user = req.user
    data = req.body
    data['ownerId'] = user.id
    data['location'] = user.location
    event = EventModel.create(data)
    return event.data

def update_event(req):
    user = req.user
    data = req.body
    event = EventModel.get_by_id(data['id'])
    if user.id != event.ownerId:
        raise MyError('Only owner can update event!')
    data['location'] = user.location
    event = EventModel.update(event, data)
    return event.data

def delete_event(req):
    user = req.user
    data = req.body
    event = EventModel.get_by_id(data['id'])
    if user.id != event.ownerId:
        raise MyError('Only owner can delete event!')
    EventModel.mark_deleted(event)
    ThreadModel.mark_deleted_for_event(event)
    return {'deleted': True}
