---
title: 'Native enums or CHECK constraints in PostgreSQL?'
date: 2023-06-15
permalink: /posts/native-enums-or-check-constraints-in-postgresql
author: João Sampaio
thumbnail: ''
metaDescription: ''
tags: [Engineering, Databases, PostgreSQL, SQLAlchemy, Tips and Tricks]
---

Recently, we had an internal discussion about whether we should use native enums in PostgreSQL, or rely on regular string columns with `CHECK` constraints. In the end, we decided that we wanted to go with regular string columns with `CHECK` constraints.

That's the short version of this article. Tag along if you want to learn the details.

## Native enums in PostgreSQL

Native enums in PostgreSQL are full-blown types. You declare a column as an enum the same way you would declare a column of any built-in type:

```sql
CREATE TYPE mood AS ENUM ('sad', 'ok', 'happy');

CREATE TABLE person (
    name text,
    current_mood mood
);
```

They come with ordering (from the order in which the values were declared) and type safety (you cannot compare two values coming from different enums, even if their string or numerical representations are the same). Although enums are intended for static sets of values, you can add values to the type and rename existing values. But enums also come with some limitations: for example, you cannot remove an existing value from an enum, and you cannot change the sorting order of existing values. To do those things, you need to create a new enum in the form you want it to have, and then change all columns to use that new type.

Creating a new enum, and swapping existing columns to use the new type, can be tricky. For the most straightforward cases, you will need something like this:

```sql
ALTER TYPE mood RENAME TO mood_old;

-- Create the new enum.
CREATE TYPE mood AS ENUM ('sad', 'happy');

-- Update existing columns to use the new enum.
ALTER TABLE person ALTER COLUMN current_mood
    TYPE mood USING current_mood::text::mood;

-- Remove the old enum.
DROP TYPE mood_old;
```

However, depending on the size of the table, the `ALTER TABLE` command can have serious performance implications, because it acquires an `ACCESS EXLUSIVE` lock. This lock is the most restrictive of all locks in PostgreSQL: your transaction is the only transaction that can access that table while it exists. Once it has that lock, it will perform a full table scan to migrate the data and ensure it conforms to the new type. This could make this alternative unfeasible to your application.

## String columns with `CHECK` constraints

String columns with `CHECK` constraints keep the most important property we want with enums: we can enforce data correctness in the database. But it also comes with more flexibility: updating a `CHECK` constraint in the most complex cases is more manageable.

The procedure to update a `CHECK` constraint is a bit more complicated than the simpler enum update cases, but it is simpler in the most complex enum update cases. And there's one very good thing about it: it's the same for all cases, so you don't have to remember multiple options.

To update a `CHECK` constraint, we do something like this:

```sql
CREATE TABLE person (
    name text,
    current_mood text CHECK (current_mood IN ('sad', 'ok', 'happy'))
);

-- Drop the old `CHECK` constraint.
ALTER TABLE person
    DROP CONSTRAINT person_current_mood_check;

-- Create the new one, but in a way that doesn't lock anything.
-- Note the `NOT VALID` syntax.
ALTER TABLE person
    ADD CONSTRAINT person_current_mood_check
        CHECK (current_mood IN ('sad', 'happy'))
        NOT VALID;

-- Finally, tell the database to make sure all rows are good.
ALTER TABLE person
    VALIDATE CONSTRAINT person_current_mood_check;
```

First, drop the `CHECK` constraint, this is a `O(1)` operation. Then, create the constraint in the new form you need, but with `NOT VALID`. This is also an `O(1)` operation: the constraint will not be enforced for existing rows, but it will be enforced for rows being created or updated. Then, we can run `VALIDATE CONSTRAINT` to make sure all rows are good. The validation command acquires a more permissive lock, the `SHARE UPDATE EXCLUSIVE`, which allows concurrent updates to the table: basically, only schema changes and vacuum operations are blocked while validating a `CHECK` constraint.

## Conclusion

Because of all the advantages of the `CHECK` constraint, and the relatively small disadvantage of the update procedure being a little more elaborate even in the simpler cases, we've decided to go with `CHECK` constraints instead of native enums in PostgreSQL.
