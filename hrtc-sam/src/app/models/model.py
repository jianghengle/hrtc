
class Model:
    def __init__(self, data={}):
        self.data = {}
        for field in self.Fields:
            value = data.get(field, None)
            self.data[field] = value
            setattr(self, field, value)
