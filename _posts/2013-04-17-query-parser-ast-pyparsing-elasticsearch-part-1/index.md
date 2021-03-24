---
layout: post
title: 'Sales data search: Writing a query parser/AST using pyparsing + Elasticsearch (part 1)'
date: 2013-04-17
permalink: /posts/query-parser-ast-pyparsing-elasticsearch-part-1
author: Thomas Steinacher
thumbnail: ''
metaDescription: ''
tags: [Engineering, Search]
---

For the [Close sales software](https://close.com/), we’ve built a powerful search engine which lets you find leads based on different criteria. For examples and insight on how our search works from a user’s perspective, check out our previous blog post about [lead search](http://close.hs-sites.com/blog/introducing-lead-search).

Our search engine supports anything from simple full text queries to advanced queries that use operators like `and`, `or` and `not`. Perhaps the most powerful search feature is our keyword search which allows you to filter on almost any possible criteria.

For example, you might want to find all your leads in New York that were last called less than three days ago and contain the word “john” somewhere in their contacts or activities. You can do this by simply entering the following query:

`john city:"new york" last_called < "3 days ago"`

In this post blog post, we will explain in detail how we’ve technically built this search by showing you how to build your own search engine. First of all, we’ve used [pyparsing](http://pyparsing.wikispaces.com/), a parsing library for Python. It splits up the search query into individual parts and generates an abstract syntax tree. An [abstract syntax tree (AST)](http://en.wikipedia.org/wiki/Abstract_syntax_tree) represents the structure of our search query. For example, the AST for the query above could look as follows:

```
And /   |   \ /      |         \ /         |               \ /            |                    \ Text       Comparison                Comparison "john"    (operator ":")            (operator "<") /         \               /           \ Text        Text           Text          Text "city"     "new york"   "last_called"  "3 days ago"
```

Once we have the AST, we can then generate a search query for [Elasticsearch](http://www.elasticsearch.org/), the search backend we’re using.

In the first part of this series, we will cover how to build a custom parser that generates an abstract syntax tree for the search query. The first version of the parser will support the following queries:

* simple full text search (`multiple keywords` or `"exact match"`)
* simple keyword search (e.g. `name:john` or `name:"john doe"`)

Multiple queries will be implicitly joined together with an “and”.

Getting started
---------------

To get started, you will of course need Python (the latest 2.7, don’t use 3.x), since this is the language we’re using. We’ll set up a virtual environment which will let us install any dependencies and keep them in the project directory. To set up our environment, we will create a new directory which will contain our project and place a file called `requirements.txt` in that directory with the following contents:

`pyparsing==1.5.6`

The file `requirements.txt` contains all dependencies that our project will need (with optional version numbers). To get started with the parser, we only need pyparsing. We can now initialize the virtual environment and install the pyparsing package the following way:

`% virtualenv venv % . venv/bin/activate % pip install -r requirements.txt`

Now we’re ready to start building our parser!

First parser
------------

To get started, we will write all our code into a Python file called `search.py` (you can name it however you want).

The first thing our parser will do is match simple words. pyparsing already comes with a `Word` class (described in [their documentation](http://pythonhosted.org/pyparsing/)), but we will manually specify the accepted character set for a word to treat unicode strings correctly. Since we want to match all non-space unicode characters, we will first get all the printable characters by writing the following line to our Python file:

```python
unicode_printables = u''.join(unichr(c) for c in xrange(65536) if not unichr(c).isspace())
```

This will give us a list of all unicode characters except for spaces, and now we can build our first parser:

```python
from pyparsing import * word = Word(unicode\_printables)
```

The expression `word` is a parser and will match single words, but not multiple words. For [Close](https://close.com), we use unit tests extensively, which is why we will include unit tests for everything that we build here as well. Here is a test function for our word parser:

```python
def test_word(self):
    self.assertMatch(word, 'john')
    self.assertNoMatch(word, 'john taylor')
```

To run these tests we need a test case class. Here is how we can plug the function above in to a test case class:

```python
import unittest

class ParserTestCase(unittest.TestCase):
    """ Tests the internals of the parser. """
    def assertMatch(self, parser, input):
        parser.parseString(input, parseAll=True)

    def assertNoMatch(self, parser, input):
        try:
            parser.parseString(input, parseAll=True)
        except ParseException:
            pass
        else:
            raise ValueError('match should fail', input)

    def test_word(self):
        self.assertMatch(word, 'john')
        self.assertNoMatch(word, 'john taylor')
```

The test case class provides two methods: `assertMatch` succeeds whenever our parser matches the input string, and `assertNoMatch` succeeds whenever our parser doesn’t match the input string. The methods are using pyparsing’s `parseString` method which is part of each parser we are constructing.

To run the test cases automatically we also need to place the following lines at the end of our Python file:

```python
if __name__ == '__main__':
  unittest.main()
```

This code tells Python to run the unit tests if we run this file directly, but not if we import it from another module.

You can look at [search1.py](https://gist.github.com/thomasst/5399884/) (Gist) to see the full code of the first version of our parser.

We can run the example by typing `python search.py` on the command line:

```bash
(venv)search % python search.py .
----------------------------------------------------------------------
Ran 1 test in 0.000s OK
```

Extending our parser: quoted strings
------------------------------------

Let’s extend our parser to accept quoted strings. The idea is that a search for `new york` should match any document that contains the word `new` and the word `york`, but they don’t need to be in that order. However, if we search for `"new york"`, we want to match only documents that contain `new york` in that order. pyparsing makes adding quoted strings to our parser grammar easy:

```python
exact = QuotedString('"', unquoteResults=True, escChar='\\')
```

The escape characters defines how we encode quotes, e.g. to search for `"john"` including the quotes, we would use `"\"john\""`. `unquoteResults=True` makes sure we get the unquoted version of the text back when we look at the parser results (e.g. `"john"` instead of `\"john\"`)

These are the test cases:

```python
def test_exact(self):
    self.assertMatch(exact, '"john taylor"')
    self.assertMatch(exact, r'"John said \"Hello world\""')
    self.assertNoMatch(exact, 'john')
```

Note that the `r` in front of the second string is on purpose and denotes a raw Python string where Python doesn’t interpret the backslash.

For our search parser, a term consists of either a word or an exact expression:

`term = exact | word`

The test cases:

```python
def test_term(self):
    self.assertMatch(term, 'john')
    self.assertMatch(term, '"john taylor"')
    self.assertNoMatch(term, 'john taylor')
```

Note that the order in which we specify the options is important as pyparsing uses the first token that matches: If we defined term as `word | exact`, then pyparsing wouldn’t parse an exact term correctly because the `word` parser would match it first.

[search2.py](https://gist.github.com/thomasst/5399894) is the current status of our Python file for the lazy.

As expected, all unit tests should pass:

```bash
(venv)search % python search.py ...
----------------------------------------------------------------------
Ran 3 test in 0.001s OK
```

Extending our parser: keyword search
------------------------------------

Keyword search is one of the most used searches in Close, which is why we don’t want to miss out on it in our initial parser. We will implement basic comparisons that let you search for things like the following:

*   **city: “new york”:** To list all leads from New York.
*   **phone: 415.** To call all contacts with the San Francisco area code.
*   **name: john.** To see all people named John.

Here is how our parser will look like:

```python
comparison_name = Word(unicode_printables, excludeChars=':')
comparison = comparison_name + Literal(':') + term
```

Here is how it works: We want to match any charcters except for a colon, then we match a colon, and then we match a term, which is either a word or a quoted string. Note that pyparsing deals with whitespaces automatically, so we don’t have to worry about matching spaces explicitly. The following test cases will pass:

```python
def test_comparison(self):
    self.assertMatch(comparison, 'created_by: justin')
    self.assertMatch(comparison, 'created_by : justin')
    self.assertMatch(comparison, 'created_by :justin')
    self.assertMatch(comparison, 'location: "san francisco"')
    self.assertNoMatch(comparison, 'justin')
```

Finally, we want people to be able to search for multiple keywords at the same time, and also mix full text queries. We can achieve this as follows:

`content = OneOrMore(comparison | term)`

Again, note that the order is important: We want to match for comparisons first, and only if it doesn’t match, we assume it’s a term. The `OneOrMore` class does what we expect and matches one or more occurrences of our expression:

```python
def test_content(self):
    self.assertMatch(content, 'john')
    self.assertMatch(content, '"john taylor"')
    self.assertMatch(content, 'john taylor')
    self.assertMatch(content, 'calls: 0 status: trial')
    self.assertMatch(content, 'john calls: 0 status: "trial expired"')
    self.assertMatch(content, 'spam "john taylor" bacon egg')
```

[search3.py](https://gist.github.com/thomasst/5399895) is the latest version of our search script at this point.

Since our content parser essentially matches any string, we want to ensure that our parser is working correctly. We will take a look at how pyparsing sees our input:

```python
(venv)search % python
>>> from search import *
>>> content.parseString('spam "john taylor" bacon egg', parseAll=True).asList()
['spam', 'john taylor', 'bacon', 'egg']
>>> content.parseString('john calls: 0 status: "trial expired"', parseAll=True).asList()
['john', 'calls', ':', '0', 'status', ':', 'trial expired']
>>>
```

As expected, the results are properly grouped into tokens. Now, let’s see how we can label these tokens and build an AST, which we will later use to generate an Elasticsearch query.

Building an abstract syntax tree (AST)
--------------------------------------

We will define the following `Node` class, which is just a subclass of the Python list class. It overrides `__eq__` so that comparisons of two objects also compare the class type, which is helpful for our unit tests. It has a `__repr__` method to print our AST nicely and it has a `group` method which we will use shortly to group our tokens. We’ll look at the `get_query` method later when we construct the actual ElasticSearch query.

```python
class Node(list):
    def __eq__(self, other):
        return list.__eq__(self, other) and self.__class__ == other.__class__

    def __repr__(self):
        return '%s(%s)' % (self.__class__.__name__, list.__repr__(self))

    @classmethod
    def group(cls, expr):
        def group_action(s, l, t):
            try:
                lst = t[0].asList()
            except (IndexError, AttributeError), e:
                lst = t
                return [cls(lst)]
            return Group(expr).setParseAction(group_action)
        def get_query(self):
            raise NotImplementedError()
```

Let’s define the AST classes, which for now are the following ones:

```python
class TextNode(Node):
    pass

class ExactNode(Node):
    pass

class ComparisonNode(Node):
    pass
```

Now let’s change our parser expressions to use the classes for grouping. We will replace our existing parsers with the new ones:

```python
word = TextNode.group(Word(unicode_printables))
exact = ExactNode.group(QuotedString('"', unquoteResults=True, escChar='\\'))
comparison = ComparisonNode.group(comparison_name + Literal(':') + term)
```

Now, when we parse our example strings, we get the following results:

```bash
(venv)search % python
>>> from search import *
>>> content.parseString('spam "john taylor" bacon egg', parseAll=True).asList()
[TextNode(['spam']), ExactNode(['john taylor']), TextNode(['bacon']), TextNode(['egg'])]
>>> content.parseString('john calls: 0 status: "trial expired"', parseAll=True).asList()
[TextNode(['john']), ComparisonNode(['calls', ':', TextNode(['0'])]), ComparisonNode(['status', ':', ExactNode(['trial expired'])])]
>>>
```

This way we can easily determine the type of each node, and we will be able to extend each node class to return the actual search query later.

Since we care about unit tests we will include the following AST test case which illustrates a few search examples:

```python
class ASTTestCase(unittest.TestCase):
    """ Ensures the abstract syntax tree is generated properly. """

    def assertAstMatch(self, input, expected_ast):
        ast = content.parseString(input, parseAll=True).asList()
        self.assertEqual(ast, expected_ast)

    def test_parser(self):
        self.assertAstMatch('john "new york"', [ TextNode(['john']), ExactNode(['new york']), ])
        self.assertAstMatch('email_opened: yes', [ ComparisonNode(['email_opened', ':', TextNode(['yes'])]), ]) self.assertAstMatch('location: "los angeles"', [ ComparisonNode(['location', ':', ExactNode(['los angeles'])]), ])
        self.assertAstMatch('phone: 415 status: "trial expired" john', [ ComparisonNode(['phone', ':', TextNode(['415'])]), ComparisonNode(['status', ':', ExactNode(['trial expired'])]), TextNode(['john']), ])
```

The result is [search4.py](https://gist.github.com/thomasst/5399897)

Where to go from here
---------------------

If you’ve followed until here, good job! We’ve successfully built a parser that parses basic search queries and constructs an AST. In the [second part](/posts/query-parser-ast-pyparsing-elasticsearch-part-2) of this series, we will cover how to construct Elasticsearch queries from the AST and test our search on actual data in Elasticsearch.