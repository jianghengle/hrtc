class MyError(Exception):
    def __init__(self, message='MyError', code=500):
        self.message = message
        self.code = code
        super().__init__(self.message)
