from . import MyError
from .my_http import MyReq, MyResp
from .controllers import user_controller
from .controllers import s3_controller
from .controllers import event_controller
from .controllers import thread_controller


class MyRouter:
    def __init__(self, path_handlers):
        self.path_handlers = path_handlers

    def route(self, req):
        req_method = req.method
        if req_method == 'OPTIONS':
            return MyResp()

        req_path_parts = self.split_path(req.path)
        for (method, path, auth_required, handler) in self.path_handlers:
            if req_method != method:
                continue
            (match, params) = self.path_match(req_path_parts, self.split_path(path))
            if match:
                if auth_required and (not req.user):
                    raise MyError('Failed to authenticate the user', 403)
                return MyResp(handler(req, *params))
        raise MyError('Did not find the handler', 404)

    def path_match(self, req_path_parts, handler_path_parts):
        params = []
        if len(req_path_parts) != len(handler_path_parts):
            return (False, None)
        for i in range(len(req_path_parts)):
            req_path_part = req_path_parts[i]
            handler_path_part = handler_path_parts[i]
            if handler_path_part.startswith(':'):
                params.append(req_path_part)
            elif handler_path_part != req_path_part:
                return (False, None)
        return (True, tuple(params))

    def split_path(self, path):
        parts = []
        for s in path.split('/'):
            part = s.strip()
            if part:
                parts.append(part)
        return parts



def handle(event, context):
    try:
        req = MyReq(event)
        router = MyRouter([
            ('GET', '/ping', False, user_controller.ping),
            ('POST', '/user/wx-login', False, user_controller.wx_login),
            ('POST', '/user/update', True, user_controller.update),
            ('GET', '/user/get-user-info/:id', True, user_controller.get_user_info),
            ('POST', '/s3/get-s3-upload-url', True, s3_controller.get_s3_upload_url),
            ('POST', '/s3/get-s3-download-url', True, s3_controller.get_s3_download_url),
            ('GET', '/event/get-all-events', True, event_controller.get_all_events),
            ('GET', '/event/get-event/:id', True, event_controller.get_event),
            ('GET', '/event/get-event-timestamp/:id', True, event_controller.get_event_timestamp),
            ('GET', '/event/get_events_by_location_status/:key', True, event_controller.get_events_by_location_status_key),
            ('GET', '/event/get_owned_events', True, event_controller.get_owned_events),
            ('POST', '/event/create-event', True, event_controller.create_event),
            ('POST', '/event/update-event', True, event_controller.update_event),
            ('POST', '/event/delete-event', True, event_controller.delete_event),
            ('GET', '/thread/get-event-threads/:event_id', True, thread_controller.get_event_threads),
            ('POST', '/thread/submit-chat', True, thread_controller.submit_chat),
            ('POST', '/thread/update-note', True, thread_controller.update_note),
            ('POST', '/thread/update-order', True, thread_controller.update_order),
            ('POST', '/thread/archive-order', True, thread_controller.archive_order),
            ('GET', '/thread/get-thread/:id', True, thread_controller.get_thread),
            ('GET', '/thread/get-thread-simple/:id', True, thread_controller.get_thread_simple),
            ('POST', '/thread/get-new-chats', True, thread_controller.get_new_chats),
            ('GET', '/thread/get-threads', True, thread_controller.get_threads),
        ])
        return router.route(req)
    except MyError as err:
        print('MyError: ' + err.message )
        return MyResp({ 'err': err.message }, err.code)
    except Exception as e:
        print(e)
        return MyResp({ 'err': str(e) }, 500)
