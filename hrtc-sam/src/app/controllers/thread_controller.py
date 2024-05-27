import requests
import simplejson as json
from ..models.event_model import EventModel
from ..models.user_model import UserModel
from ..models.thread_model import ThreadModel
from .. import MyError

def get_event_threads(req, event_id):
    user = req.user
    event = EventModel.get_by_id(event_id)
    threads = ThreadModel.get_threads_by_event_id(event_id)
    return {'threads': [thread.get_simple_data(event) for thread in threads]}

def get_threads(req):
    user = req.user
    owner_threads = ThreadModel.get_threads_by_event_owner_id(user.id)
    user_threads = ThreadModel.get_threads_by_user_id(user.id)
    threads = owner_threads + user_threads
    return {'threads': [thread.get_simple_data() for thread in threads]}

def get_thread_simple(req, id):
    user = req.user
    thread = ThreadModel.get_by_id(id)
    if thread.eventOwnerId != user.id and thread.userId != user.id:
        raise MyError('User is not in this thread!')
    data = thread.get_simple_data()
    if thread.historyOrders:
        data['historyOrders'] = thread.historyOrders
    return data

def get_thread(req, id):
    user = req.user
    thread = ThreadModel.get_by_id(id)
    if thread.eventOwnerId != user.id and thread.userId != user.id:
        raise MyError('User is not in this thread!')
    ThreadModel.update_count(thread, user)
    data = thread.data
    if user.id == thread.eventOwnerId:
        data['eventOwnerCount'] = len(thread.chats)
    elif user.id == thread.userId:
        data['userCount'] = len(thread.chats) 
    return data

def submit_chat(req):
    user = req.user
    data = req.body
    thread_id = data.get('threadId', None)
    event_id = data['eventId']
    chat = data['chat']
    chat['userId'] = user.id
    if thread_id:
        thread = ThreadModel.get_by_id(thread_id)
        if user.id != thread.eventOwnerId and user.id != thread.userId:
            raise MyError('User is not in this thread!')
        ThreadModel.append_chat(thread_id, chat)
    else:
        event = EventModel.get_by_id(event_id)
        if user.id == event.ownerId:
            raise MyError('Event owner can create thread!')
        thread_id = ThreadModel.create_thread(event, user, chat)
        threads_count = (event.threadsCount + 1) if event.threadsCount else 1
        EventModel.update_threads_count(event, threads_count)
    return {'threadId': thread_id}

def get_new_chats(req):
    user = req.user
    data = req.body
    thread = ThreadModel.get_by_id(data['threadId'])
    if thread.eventOwnerId != user.id and thread.userId != user.id:
        raise MyError('User is not in this thread!')
    chat_count = len(thread.chats)
    new_chats = []
    if data['chatCount'] < len(thread.chats):
        ThreadModel.update_count(thread, user)
        new_chats = thread.chats[(data['chatCount']):]
    return {
        'chatCount': chat_count,
        'newChats': new_chats,
    }

def update_note(req):
    user = req.user
    data = req.body
    thread_id = data['threadId']
    note = data['note']
    thread = ThreadModel.get_by_id(thread_id)
    if user.id != thread.eventOwnerId:
        raise MyError('Only owner can update note!')
    ThreadModel.update_note(thread, note)
    return {'ok': True}

def update_order(req):
    user = req.user
    data = req.body
    event_id = data['eventId']
    event = EventModel.get_by_id(event_id)
    if event.status != 'open':
        raise MyError('Closed event cannot update order!')
    if user.id == event.ownerId:
        raise MyError('Event owner cannot update order!')
    thread_id = data.get('threadId', None)
    if not thread_id:
        thread_id = ThreadModel.create_thread(event, user)
        threads_count = (event.threadsCount + 1) if event.threadsCount else 1
        EventModel.update_threads_count(event, threads_count)
    ordered_items = data['orderedItems']
    thread = ThreadModel.update_order(user, event, thread_id, ordered_items)
    return thread.get_simple_data()

def archive_order(req):
    user = req.user
    data = req.body
    event_id = data['eventId']
    event = EventModel.get_by_id(event_id)
    thread_id = data['threadId']
    thread = ThreadModel.get_by_id(thread_id)
    if not len(thread.orderedItems):
        raise MyError('No orderedItems to be archived!')
    if user.id != thread.eventOwnerId and user.id != thread.userId:
        raise MyError('Only thread owner can archive order!')
    ThreadModel.archive_order(user, event, thread)
    return {'ok': True}
