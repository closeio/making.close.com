---
layout: post
title: 'Sales data search: Writing a query parser / AST using pyparsing + elasticsearch (part 2)'
date: 2013-05-06
permalink: /posts/query-parser-ast-pyparsing-elasticsearch-part-2
author: Thomas Steinacher
thumbnail: ''
metaDescription: ''
tags: [Engineering, Search]
---

In [part 1](/posts/query-parser-ast-pyparsing-elasticsearch-part-1) of this series, we built a search query parser using pyparsing which generates an abstract syntax tree (AST) that represents the structure of a search query. In this part, we will cover how to generate an Elasticsearch query by extending the [code of the first part](https://gist.github.com/thomasst/5399897). We will also perform some actual search queries on sample leads.

As a reminder, the [Close](https://close.com/) sales search lets you do powerful queries such as the following:

```
john city:"new york" last_called < "3 days ago"
```

The search parser from part 1 supports simple full text queries and simple keyword search. Let’s see how we can generate a search query.

Generating an Elasticsearch query
---------------------------------

We will extend our node classes to generate a query. To do this, find the following node classes in our code from part 1:

```python
class TextNode(Node):
    pass

class ExactNode(Node):
    pass

class ComparisonNode(Node):
    pass
```

We will now implement the `get_query` instance method for these nodes. First, we will do the exact search which uses a `match_phrase` query as described in the [Elasticsearch match query documentation](http://www.elasticsearch.org/guide/reference/query-dsl/match-query/). We are searching the `_all` field which elasticserch provides by default. This is a special field that contains the text of all search document fields, making it suitable for full-text search. To make the node class reusable, we’ll add an optional argument `field` which will let us override the field if needed (you will see later why):

```python
class ExactNode(Node):
    def get_query(self, field='_all'):
        return {
            'match_phrase': {
                 field: self[0]
             }
        }
```

The `TextNode` will search in all fields using a prefix match. This provides a great “as you type” experience by listing leads where the prefix matches, so the user doesn’t need to type out the entire keyword:

```python
class TextNode(Node):
    def get_query(self, field='_all'):
        return {
            'match_phrase_prefix': {
                 field: {
                    'query': self[0],
                    'max_expansions': 10
                 }
             }
        }
```

Using the phrase prefix search comes with the disadvantage that you need to use the `max_expansions` parameter to control to how many prefixes the search term will be expanded. If it’s set too high, the query execution time will be higher, if it’s set too low, it will not match all of the entries. In order to match all the possible entries, we would need to index all of the prefixes separately, but for the purpose of this article we will keep using the phrase prefix search.

Let’s implement the keyword search by extending our comparison node class:

```python
class ComparisonNode(Node):
    def get_query(self):
        field = self[0]
        op = self[1]
        node = self[2]

        if op == ':':
            return node.get_query(field)
        else:
            raise NotImplementedError('Only ":" comparisons are implemented.')
```

Now we can see why we we made `field` an argument in the `TextNode` and `ExactNode`. As a reminder, the `ComparisonNode` for the query `city: "new york"` will look as follows:

```python
ComparisonNode(['city', ':', ExactNode(['new york'])]),
```

For our simple keyword search we can therefore simply call the `get_query` method of the nested node, constraining it to the given field.

To see that our code operates properly, let’s add a test case to test the query generation from the AST:

```python
class QueryGenerationTestCase(unittest.TestCase):
    def test_exact(self):
        self.assertEquals(
            ExactNode(['san francisco']).get_query(),
            { 'match_phrase': { '_all': 'san francisco' } }
        )

    def test_text(self):
        self.assertEquals(
            TextNode(['john']).get_query(),
            { 'match_phrase_prefix': { '_all': { 'query': 'john', 'max_expansions': 10 } } }
        )

    def test_comparison(self):
        self.assertEquals(
            ComparisonNode(['city', ':', ExactNode(['new york'])]).get_query(),
            { 'match_phrase': { 'city': 'new york' } }
        )
        self.assertEquals(
            ComparisonNode(['city', ':', TextNode(['minneapolis'])]).get_query(),
            { 'match_phrase_prefix': { 'city': { 'query': 'minneapolis', 'max_expansions': 10 } } }
        )
```

Finally, we need a way to generate the full Elasticsearch query for a given search text. The following method will return our query, requiring all expressions to be present in the search document using the [bool query](http://www.elasticsearch.org/guide/reference/query-dsl/match-query/):

```python
def get_query(search_query):
    nodes = content.parseString(search_query, parseAll=True).asList()
    return {
        'bool': {
            'must': [node.get_query() for node in nodes]
        }
    }
```

And the corresponding test case:

```python
    def test_query(self):
        self.assertEqual(get_query('phone: 415 status: "trial expired" john "new york"'),
            {'bool': {'must': [
                {'match_phrase_prefix': {'phone': {'query': '415', 'max_expansions': 10}}},
                {'match_phrase': {'status': 'trial expired'}},
                {'match_phrase_prefix': {'_all': {'query': 'john', 'max_expansions': 10}}},
                {'match_phrase': {'_all': 'new york'}}
            ]}}
        )
```

You can look at [search5.py](https://gist.github.com/thomasst/5520201) (Gist) to see all the code that we’ve written so far.

Setting up Elasticsearch
------------------------

Up to this point, we have been constructing queries, but we haven’t actually run any of these queries in Elasticsearch. It’s time to get Elasticsearch runnning. If you haven’t yet, download Elasticsearch from their [download page](http://www.elasticsearch.org/download/). We are using version 0.90.0 for this article (older versions may not work properly).

To start Elasticsearch, simply extract the archive, go to the Elasticsearch directory and run it using the following command:

```bash
./bin/elasticsearch
```

If it’s running, you can go to [http://localhost:9200/](http://localhost:9200/) and see the status. If you have trouble, use the `-f` option to run Elasticsearch in the foreground.

A common cause of errors is having multiple Elasticsearch instances running on the local network (e.g. if your coworkers run it). If you think this might be a problem, edit your `config/elasticsearch.yml`and set the following setting:

```
network.host: 127.0.0.1
```

Apart from this, Elasticsearch typically doesn’t require any special configuration.

In addition to Elasticsearch, we will also need to install the Python library by appending the following line to our `requirements.txt` file:

```
-e git+ssh://git@github.com/elasticsales/pyelasticsearch.git@votizen#egg=pyelasticsearch
```

To install the package, type `pip install -r requirements.txt`.

Storing leads and performing searches in Elasticsearch
------------------------------------------------------

We can store data in Elasticsearch by issuing an HTTP request with our document in JSON format. We will use a simplified lead schema and index an example lead using `curl`:

```bash
% curl -XPUT http://localhost:9200/myindex/lead/1 -d '{
    "id": 1,
    "company": "Facebook Inc.",
    "contact": "Mark Zuckerberg",
    "city": "Menlo Park",
    "description": "an online networking site"
}'
{"ok":true,"_index":"myindex","_type":"lead","_id":"1","_version":1}
```

This will store a document of type `lead` with id 1 in the index `myindex`. By going to [http://localhost:9200/myindex/lead/1](http://localhost:9200/myindex/lead/1) in our browser we can verify that the lead has been indexed.

We can also index a lead in Python using pyelasticsearch. Let’s index another lead:

```python
>>> from pyelasticsearch import ElasticSearch
>>> es = ElasticSearch('http://localhost:9200/')
>>> es.index('myindex', 'lead', {
        "id": 2,
        "company": "Microsoft",
        "contact": "Steve Ballmer",
        "city": "Redmond",
        "description": "software and online services"
    }, 2)
{u'_id': u'2', u'_index': u'myindex', u'_type': u'lead', u'_version': 1, u'ok': True}
```

We can now perform a simple search:

```bash
% curl 'http://localhost:9200/myindex/lead/_search?pretty=true' -d '{ "query": { "match": { "_all": "facebook" } } }'
{
  "took" : 1,
  "timed_out" : false,
  "_shards" : {
    "total" : 5,
    "successful" : 5,
    "failed" : 0
  },
  "hits" : {
    "total" : 1,
    "max_score" : 0.095891505,
    "hits" : [ {
      "_index" : "myindex",
      "_type" : "lead",
      "_id" : "1",
      "_score" : 0.095891505, "_source" : {"city": "Menlo Park", "company": "Facebook Inc.", "contact": "Mark Zuckerberg", "description": "an online networking site"}
    } ]
  }
}
```

And the same search in Python:

```python
>>> es.search({ "query": { "match": { "_all": "facebook" } } }, index='myindex', doc_type='lead')
{u'_shards': {u'failed': 0, u'successful': 5, u'total': 5},
 u'hits': {u'hits': [{u'_id': u'1',
    u'_index': u'myindex',
    u'_score': 0.095891505,
    u'_source': {u'city': u'Menlo Park',
     u'company': u'Facebook Inc.',
     u'contact': u'Mark Zuckerberg',
     u'description': u'an online networking site'},
    u'_type': u'lead'}],
  u'max_score': 0.095891505,
  u'total': 1},
 u'timed_out': False,
 u'took': 1}
```

Finishing the code
------------------

Now that we know how to index leads and search for them, we can build our last function which will combine everything: It will take the search query as an argument and return the leads that matched the given search query:

```python
from pyelasticsearch import ElasticSearch

ELASTICSEARCH_INDEX = 'myindex'
ELASTICSEARCH_URL = 'http://localhost:9200/'

es = ElasticSearch(ELASTICSEARCH_URL)


def perform_search(search_query):
    full_query = {
        'query': get_query(search_query),
    }

    results = es.search(full_query, index=ELASTICSEARCH_INDEX, doc_type='lead')
    return results['hits']['hits']
```

The corresponding unit test will make sure we start with a clean index, add a few example leads and then perform a few test searches. One thing to keep in mind is that we need to wait until Elasticsearch finishes generating the index, otherwise our search tests won’t return any results.

```python
from pyelasticsearch import ElasticHttpNotFoundError

class SearchTestCase(unittest.TestCase):
    def setUp(self):
        try:
            es.delete_index(ELASTICSEARCH_INDEX)
        except ElasticHttpNotFoundError:
            pass

        self.leads = [{
            "id": 1,
            "company": "Facebook Inc.",
            "contact": "Mark Zuckerberg",
            "city": "Menlo Park",
            "description": "an online networking site"
        }, {
            "id": 2,
            "company": "Microsoft",
            "contact": "Steve Ballmer",
            "city": "Redmond",
            "description": "software and online services"
        }]

        for lead in self.leads:
            es.index('myindex', 'lead', lead, lead['id'])

        # Wait for the search index to be generated.
        while es.status(ELASTICSEARCH_INDEX)['indices'][ELASTICSEARCH_INDEX]['docs']['num_docs'] < len(self.leads):
            import time
            time.sleep(1)

    def assertSearchMatch(self, query, matches):
        results = perform_search(query)
        self.assertEqual(set([int(r['_id']) for r in results]), set(matches))

    def test_search(self):
        self.assertSearchMatch('onl', [1, 2])
        self.assertSearchMatch('online', [1, 2])
        self.assertSearchMatch('online networking', [1])
        self.assertSearchMatch('company: microsoft', [2])
        self.assertSearchMatch('contact: microsoft', [])
        self.assertSearchMatch('"menlo park"', [1])
        self.assertSearchMatch('"park menlo"', [])
```

See [search6.py](https://gist.github.com/thomasst/5520204) for the full code.

Conclusion
----------

We now have a full search backend that returns matching leads for a given search query. If you followed until here, congratulations!

There are of course many things that were not covered in this article. Here are just a few of the things that the [Close](https://close.com) lead search supports that we haven’t covered:

*   Nested queries, `and`, `or` and `not` operators
*   Searching dates and numeric values, including comparisons like `last_called > "3 days ago"`
*   Introducing a `sort` keyword to order results

If you’d like to see a third part of this series, let us know what you’d like to see in the comments!

\- Thomas Steinacher
