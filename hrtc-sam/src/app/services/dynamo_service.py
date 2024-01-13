import boto3
from boto3.dynamodb.conditions import Key

context_cache = {}

def get_resource(role=None, region='us-west-2'):
    cache_key = str(role) + '__' +region
    if cache_key in context_cache:
        return context_cache[cache_key]
    if role:
        sts_connection = boto3.client('sts')
        acct_b = sts_connection.assume_role(RoleArn=role, RoleSessionName='cross_acct_lambda')

        ACCESS_KEY = acct_b['Credentials']['AccessKeyId']
        SECRET_KEY = acct_b['Credentials']['SecretAccessKey']
        SESSION_TOKEN = acct_b['Credentials']['SessionToken']

        resource = boto3.resource(
            'dynamodb',
            aws_access_key_id=ACCESS_KEY,
            aws_secret_access_key=SECRET_KEY,
            aws_session_token=SESSION_TOKEN,
            region_name=region
        )
    else:
        resource = boto3.resource('dynamodb', region_name=region)
    context_cache[cache_key] = resource
    return resource


def create_table(table_name, attribute_definitions, key_schema, global_secondary_indexes=[], role=None, region='us-west-2'):
    resource = get_resource(role, region)
    if len(global_secondary_indexes):
        table = resource.create_table(
            TableName=table_name,
            AttributeDefinitions=attribute_definitions,
            KeySchema=key_schema,
            GlobalSecondaryIndexes=global_secondary_indexes,
            BillingMode='PAY_PER_REQUEST'
        )
    else:
        table = resource.create_table(
            TableName=table_name,
            AttributeDefinitions=attribute_definitions,
            KeySchema=key_schema,
            BillingMode='PAY_PER_REQUEST'
        )
    return table


def get_table(table_name, role=None, region='us-west-2'):
    cache_key = str(role) + '__' + region + '__' + table_name
    if cache_key in context_cache:
        return context_cache[cache_key]
    resource = get_resource(role, region)
    table = resource.Table(table_name)
    context_cache[cache_key] = table
    return table


def query(table, index_name, index_key, index_value):
    response = table.query(
        IndexName=index_name,
        KeyConditionExpression=Key(index_key).eq(index_value),
    )
    return response.get('Items')

def get_item(table, key_name, key_value):
    response = table.get_item(Key={ key_name: key_value })
    return response.get('Item', None)

def update_item(table, key_name, key_value, attr_updates):
    key = { key_name: key_value }
    exp_names = {}
    exp_values = {}
    exp_parts = []
    for attr_name in attr_updates:
        exp_names['#' + attr_name] = attr_name
        exp_values[':' + attr_name] = attr_updates[attr_name]
        exp_parts.append('#' + attr_name + ' = :' + attr_name)
        
    exp = 'SET '  + ', '.join(exp_parts)
    response = table.update_item(
        Key=key,
        ExpressionAttributeNames=exp_names,
        ExpressionAttributeValues=exp_values,
        UpdateExpression=exp,
    )

def increment_attr(table, key_name, key_value, attr):
    response = table.update_item(
        Key={key_name: key_value},
        ExpressionAttributeNames={'#' + attr: attr},
        ExpressionAttributeValues={':inc': 1},
        UpdateExpression='ADD #' + attr + ' :inc',
        ReturnValues='UPDATED_NEW'
    )
    return response['Attributes'][attr]

def create_item(table, item, key_name):
    table.put_item(Item=item, ConditionExpression='attribute_not_exists(' + key_name + ')')

def delete_item(table, key_name, key_value):
    response = table.delete_item(Key={ key_name: key_value })

def scan(table):
    response = table.scan()
    return response['Items']

