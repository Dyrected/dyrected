# Feature: Collection Aggregations

## Status

Accepted

## Summary

Add first-class aggregation support to Dyrected collections so applications can calculate statistics across an entire collection without fetching all matching documents.

The feature should support:

- `count`
- `sum`
- `avg`
- `min`
- `max`
- filtering before aggregation
- type casting during aggregation
- multiple aggregates in a single request

The primary use case is dashboards and operational views where the application needs accurate statistics across potentially thousands or millions of records.

---

# Problem

The collection REST API is paginated.

A list request should return a bounded number of documents. It should never require an application to fetch an entire collection just to calculate a statistic.

For example, an RSVP dashboard may need to display:

- total submissions
- total attending
- total declined
- number of spouses attending
- total Asoebi orders
- total Asoebi yards
- total male Aso Oke
- total female Aso Oke
- total revenue

The current approach requires fetching documents and calculating the values in application code:

```ts
const response = await client.collection("rsvp_records").find({
  limit: 100,
});

for (const record of response.docs) {
  // calculate statistics
}
````

This is incorrect for a collection containing more records than the page limit.

Increasing the limit does not solve the underlying problem.

The application should ask the database to calculate the statistic instead.

---

# Goals

## Primary goals

1. Calculate statistics without returning the matching documents.
2. Support filtering before aggregation.
3. Support multiple aggregates in one request.
4. Support numeric conversion during aggregation.
5. Use the underlying database's native aggregation capabilities where possible.
6. Keep the API database-independent.
7. Expose the capability through the SDK and REST API.
8. Preserve the existing collection querying model.

## Secondary goals

* Allow aggregation to power admin dashboard components.
* Allow plugins to use aggregation for operational statistics.
* Provide a foundation for future grouped statistics.
* Make aggregation safe for large collections.

---

# Non-goals

This feature is not intended to become a general-purpose database query language.

Do not expose:

* arbitrary MongoDB pipelines
* raw SQL
* arbitrary database expressions
* database-specific operators

The public API should remain database-independent.

---

# API Design

Aggregation is a collection operation.

The SDK should expose:

```ts
client.collection("rsvp_records").aggregate(...)
```

The operation should return aggregate values only.

It should not return collection documents.

---

# Basic Example

Count all RSVP records:

```ts
const result = await client.collection("rsvp_records").aggregate({
  count: "*",
});
```

Expected result:

```ts
{
  count: 143
}
```

---

# Multiple Aggregates

A single request should support multiple aggregate calculations.

```ts
const result = await client.collection("rsvp_records").aggregate({
  count: "*",

  attending: {
    count: "*",
    where: {
      attending: {
        equals: true,
      },
    },
  },

  declined: {
    count: "*",
    where: {
      attending: {
        equals: false,
      },
    },
  },
});
```

Expected result:

```ts
{
  count: 143,
  attending: 112,
  declined: 31,
}
```

The database should calculate these values without returning the 143 documents.

---

# Aggregate Operations

The initial supported operations are:

```ts
count
sum
avg
min
max
```

## Count

```ts
const result = await client.collection("rsvp_records").aggregate({
  count: "*",
});
```

Count matching documents:

```ts
const result = await client.collection("rsvp_records").aggregate({
  attending: {
    count: "*",
    where: {
      attending: {
        equals: true,
      },
    },
  },
});
```

---

# Sum

```ts
const result = await client.collection("rsvp_records").aggregate({
  totalAsoOkeMaleQty: {
    sum: "asoOkeMaleQty",
  },
});
```

With filtering:

```ts
const result = await client.collection("rsvp_records").aggregate({
  totalAsoOkeMaleQty: {
    sum: "asoOkeMaleQty",
    where: {
      attending: {
        equals: true,
      },
    },
  },
});
```

---

# Average

```ts
const result = await client.collection("orders").aggregate({
  averageOrderValue: {
    avg: "total",
  },
});
```

---

# Minimum and Maximum

```ts
const result = await client.collection("orders").aggregate({
  minimumOrderValue: {
    min: "total",
  },

  maximumOrderValue: {
    max: "total",
  },
});
```

---

# Filtering

Aggregation should use the same `where` syntax already used by collection queries.

Example:

```ts
const result = await client.collection("rsvp_records").aggregate({
  asoebiOrders: {
    count: "*",
    where: {
      AND: [
        {
          attending: {
            equals: true,
          },
        },
        {
          wantsAsoebi: {
            equals: true,
          },
        },
      ],
    },
  },
});
```

Aggregation must support the same operators supported by collection filtering.

This is important because developers should not have to learn a second filtering language.

---

# Type Casting

## Problem

Existing Dyrected projects may contain numeric values stored as strings.

For example:

```ts
defineSelectField({
  name: "asoebiYards",
  options: [
    { label: "2 Yards (₦20,000)", value: "2" },
    { label: "3 Yards (₦30,000)", value: "3" },
    { label: "4 Yards (₦40,000)", value: "4" },
    { label: "5 Yards (₦50,000)", value: "5" },
    { label: "6 Yards (₦60,000)", value: "6" },
  ],
});
```

The stored values are strings:

```text
"2"
"3"
"4"
"5"
"6"
```

Changing the schema to a number field is not sufficient because existing records already contain string values.

Aggregation must therefore support explicit type conversion.

---

# Cast Syntax

Aggregates should support a `cast` option.

Example:

```ts
const result = await client.collection("rsvp_records").aggregate({
  totalAsoebiYards: {
    sum: "asoebiYards",
    cast: "number",
  },
});
```

The aggregation engine should interpret this as:

```text
asoebiYards → number → sum
```

rather than:

```text
asoebiYards → sum
```

---

# Supported Cast Types

Initial supported cast types:

```ts
number
integer
float
string
boolean
date
```

The implementation may map these types to the appropriate native database conversion operations.

The public Dyrected API must remain database-independent.

---

# Numeric Casting

For numeric aggregation, the most important conversion is:

```ts
cast: "number"
```

Example:

```ts
const result = await client.collection("rsvp_records").aggregate({
  totalAsoebiYards: {
    sum: "asoebiYards",
    cast: "number",
  },
});
```

If the records contain:

```json
{
  "asoebiYards": "2"
}
```

and:

```json
{
  "asoebiYards": "4"
}
```

the result should be:

```json
{
  "totalAsoebiYards": 6
}
```

---

# Invalid Values

Type conversion must define behavior for invalid values.

Example:

```json
{
  "asoebiYards": "unknown"
}
```

The aggregation API should not silently produce an incorrect result.

The preferred default behavior is:

* invalid numeric values are treated as `null`
* `sum`, `avg`, `min`, and `max` ignore `null`
* `count` continues to count documents because the document itself still exists

Example:

```text
"2"      → 2
"4"      → 4
"unknown" → null
null     → null
```

Result:

```text
SUM = 6
```

---

# Strict Conversion

The API may later support explicit conversion behavior:

```ts
cast: {
  type: "number",
  onError: "null",
}
```

or:

```ts
cast: {
  type: "number",
  onError: "error",
}
```

For the initial implementation, `cast: "number"` should use safe conversion semantics.

---

# RSVP Example

The current RSVP dashboard can be rewritten without fetching all RSVP documents.

```ts
const result = await client.collection("rsvp_records").aggregate({
  totalSubmitted: {
    count: "*",
  },

  totalAttending: {
    count: "*",
    where: {
      attending: {
        equals: true,
      },
    },
  },

  totalDeclined: {
    count: "*",
    where: {
      attending: {
        equals: false,
      },
    },
  },

  spouseAttendingCount: {
    count: "*",
    where: {
      AND: [
        {
          attending: {
            equals: true,
          },
        },
        {
          hasSpouse: {
            equals: true,
          },
        },
      ],
    },
  },

  asoebiOrderCount: {
    count: "*",
    where: {
      AND: [
        {
          attending: {
            equals: true,
          },
        },
        {
          wantsAsoebi: {
            equals: true,
          },
        },
      ],
    },
  },

  totalAsoebiYards: {
    sum: "asoebiYards",
    cast: "number",
    where: {
      AND: [
        {
          attending: {
            equals: true,
          },
        },
        {
          wantsAsoebi: {
            equals: true,
          },
        },
      ],
    },
  },

  totalAsoOkeMaleQty: {
    sum: "asoOkeMaleQty",
    cast: "number",
    where: {
      AND: [
        {
          attending: {
            equals: true,
          },
        },
        {
          wantsAsoOke: {
            equals: true,
          },
        },
      ],
    },
  },

  totalAsoOkeFemaleQty: {
    sum: "asoOkeFemaleQty",
    cast: "number",
    where: {
      AND: [
        {
          attending: {
            equals: true,
          },
        },
        {
          wantsAsoOke: {
            equals: true,
          },
        },
      ],
    },
  },
});
```

Expected result:

```ts
{
  totalSubmitted: 143,
  totalAttending: 112,
  totalDeclined: 31,
  spouseAttendingCount: 42,
  asoebiOrderCount: 67,
  totalAsoebiYards: 284,
  totalAsoOkeMaleQty: 47,
  totalAsoOkeFemaleQty: 61,
}
```

Only the aggregate result is returned.

---

# Calculated Values

Revenue is currently calculated in application code:

```ts
const fabricRevenue = totalAsoebiYards * pricePerYard;
```

This should remain application-level logic initially.

The aggregation system should focus on database aggregation primitives.

Future support may allow expressions such as:

```text
SUM(quantity * price)
```

but this should not be part of the initial implementation.

---

# Database Implementation

The public aggregation API must not expose database-specific syntax.

Each database adapter should translate the aggregate request into its native query mechanism.

## MongoDB

MongoDB already provides an aggregation pipeline and type conversion operators.

Dyrected should use MongoDB's native aggregation capabilities internally rather than retrieving documents into Node.js.

For example, a conceptual operation such as:

```ts
{
  sum: "asoebiYards",
  cast: "number"
}
```

can be translated internally into MongoDB aggregation stages using numeric conversion before `$sum`.

MongoDB's `$convert`, `$toInt`, `$toDouble`, and related operators provide the required conversion primitives.

Dyrected should learn from this design but should not expose MongoDB operators such as `$convert` directly in the public API.

---

# Adapter Architecture

Aggregation should become a database adapter capability.

Conceptually, the database adapter should expose:

```ts
interface DatabaseAdapter {
  find(args: FindArgs): Promise<FindResult>;

  findOne(args: FindOneArgs): Promise<any>;

  aggregate(args: AggregateArgs): Promise<AggregateResult>;

  create(args: CreateArgs): Promise<any>;

  update(args: UpdateArgs): Promise<any>;

  delete(args: DeleteArgs): Promise<any>;
}
```

Each adapter implements aggregation using its native database capabilities.

MongoDB:

```text
AggregateArgs
    ↓
MongoDB aggregation pipeline
    ↓
Result
```

PostgreSQL:

```text
AggregateArgs
    ↓
SQL aggregate functions
    ↓
Result
```

SQLite:

```text
AggregateArgs
    ↓
SQLite aggregate functions
    ↓
Result
```

The SDK and REST API remain unchanged regardless of the database adapter.

---

# REST API

The REST API should expose aggregation as a collection operation.

Proposed endpoint:

```http
GET /api/{collection}/aggregate
```

The REST API should support the same aggregation operations as the SDK.

The exact query-string encoding should be finalized alongside the REST API implementation.

The REST API must not expose raw MongoDB aggregation pipelines or SQL.

---

# SDK

The SDK should expose:

```ts
client.collection("rsvp_records").aggregate(...)
```

The return type should be strongly typed where possible.

For example:

```ts
const result = await client.collection("rsvp_records").aggregate({
  totalSubmitted: {
    count: "*",
  },

  totalAsoebiYards: {
    sum: "asoebiYards",
    cast: "number",
  },
});
```

Result:

```ts
{
  totalSubmitted: number;
  totalAsoebiYards: number;
}
```

---

# Performance Requirements

Aggregation must execute on the database.

The implementation must not:

1. fetch all matching documents;
2. serialize all documents;
3. send them over HTTP;
4. calculate the aggregate in the SDK.

For a collection containing 10,000 records, an aggregate request should return a small response containing only the requested statistics.

For example:

```json
{
  "totalSubmitted": 10000,
  "totalAttending": 7321
}
```

The response size should remain approximately constant as collection size increases.

---

# Security

Aggregation must respect collection access control.

A user must not be able to use aggregation to learn information about records they could not otherwise read.

For example, if:

```ts
access: {
  read: ...
}
```

restricts a user to a subset of documents, an aggregate request must operate only on documents available to that user.

This is especially important for:

* count
* sum
* averages
* financial values
* private content

Aggregation must not become a side-channel around collection permissions.

---

# Future: Grouping

Grouping is not required for the initial release but should be considered in the design.

Example:

```ts
const result = await client.collection("rsvp_records").aggregate({
  groupBy: "asoebiPaymentStatus",

  aggregates: {
    count: {
      count: "*",
    },

    totalYards: {
      sum: "asoebiYards",
      cast: "number",
    },
  },
});
```

Possible result:

```ts
[
  {
    group: "pending",
    count: 21,
    totalYards: 84,
  },
  {
    group: "received",
    count: 37,
    totalYards: 156,
  },
  {
    group: "partial",
    count: 7,
    totalYards: 29,
  },
]
```

Grouping should be implemented only after the basic aggregation API is stable.

---

# Future: Computed Aggregates

A future version may support expressions.

Example:

```ts
{
  totalRevenue: {
    sum: {
      multiply: [
        "asoebiYards",
        "$pricePerYard"
      ]
    }
  }
}
```

This should not be implemented in the first version.

The first version should establish the primitives:

```text
count
sum
avg
min
max
where
cast
```

---

# Acceptance Criteria

## Basic aggregation

* [ ] A collection supports `aggregate()`.
* [ ] `count` works.
* [ ] `sum` works.
* [ ] `avg` works.
* [ ] `min` works.
* [ ] `max` works.
* [ ] Multiple aggregates can be requested in one operation.
* [ ] Aggregation does not return documents.

## Filtering

* [ ] Aggregation accepts the existing Dyrected `where` syntax.
* [ ] Multiple conditions can be combined.
* [ ] Existing access rules are respected.

## Type conversion

* [ ] String values can be cast to numbers.
* [ ] Integer conversion is supported.
* [ ] Floating-point conversion is supported.
* [ ] Invalid conversions have defined behavior.
* [ ] Null values do not cause aggregation failures.
* [ ] Existing string-based numeric data can be aggregated without migrating existing records.

## Database adapters

* [ ] MongoDB uses native aggregation capabilities.
* [ ] PostgreSQL uses native aggregate functions.
* [ ] SQLite uses native aggregate functions where supported.
* [ ] No database-specific syntax is exposed through the public API.

## SDK

* [ ] `client.collection(...).aggregate()` is available.
* [ ] Aggregate results are typed.
* [ ] Multiple aggregates work in a single request.

## REST API

* [ ] Aggregate requests are available through REST.
* [ ] REST responses contain aggregate values only.
* [ ] REST aggregation respects collection access rules.

---

# Example: Before and After

## Before

```ts
const response = await client.collection("rsvp_records").find({
  limit: 1000,
});

const docs = response.docs;

const totalSubmitted = docs.length;

const totalAttending = docs.filter(
  (record) => record.attending === true
).length;

const totalAsoebiYards = docs.reduce(
  (total, record) => total + Number(record.asoebiYards || 0),
  0
);
```

Problems:

* limited by pagination;
* transfers unnecessary data;
* consumes memory;
* performs computation in application code;
* becomes increasingly expensive as the collection grows;
* cannot guarantee complete results once the collection exceeds the fetched page.

## After

```ts
const result = await client.collection("rsvp_records").aggregate({
  totalSubmitted: {
    count: "*",
  },

  totalAttending: {
    count: "*",
    where: {
      attending: {
        equals: true,
      },
    },
  },

  totalAsoebiYards: {
    sum: "asoebiYards",
    cast: "number",
    where: {
      AND: [
        {
          attending: {
            equals: true,
          },
        },
        {
          wantsAsoebi: {
            equals: true,
          },
        },
      ],
    },
  },
});
```

Result:

```ts
{
  totalSubmitted: 143,
  totalAttending: 112,
  totalAsoebiYards: 284,
}
```

No RSVP documents need to be transferred to the application.

---

# Product Principle

Pagination answers:

> "Which records should I return?"

Aggregation answers:

> "What can you tell me about the matching records?"

These are different operations and should remain separate in Dyrected.

The goal is not to make `find()` capable of returning unlimited records.

The goal is to make it unnecessary to return those records when the application only needs a statistic.


### One change I would make to the proposal

I deliberately made **casting part of the aggregate operation**, rather than adding some generic `cast` feature to the collection API first.

That's because your existing data is a real example of why this matters:

```ts
asoebiYards: "2"
````

You don't want to force migrations just because somebody modelled a value as a select originally. MongoDB's approach is useful here: **conversion can happen inside the database operation**, immediately before the value is used.

And I'd keep the public Dyrected syntax simple:

```ts
{
  sum: "asoebiYards",
  cast: "number"
}
```

rather than exposing Mongo's:

```text
$convert
$toInt
$toDouble
$toDecimal
```

That way MongoDB becomes an implementation detail, while Dyrected owns the developer experience.

One other thing I would strongly recommend: **don't build grouping in v1.** `count + sum + avg + min + max + where + cast` solves your RSVP case and a surprisingly large number of dashboard/ERP use cases. Grouping can come later once the basic abstraction has proven itself.

---

# Implementation Decisions

Recorded 2026-08-18. These decisions are final and should be implemented exactly as described.

## 1. REST endpoint: POST

The aggregate endpoint uses `POST`:

```http
POST /api/{collection}/aggregate
```

The aggregate request body is too large and structurally complex to encode as a query string. `GET` with a `?body=<JSON>` query param is fragile and hits URL length limits on real RSVP-scale payloads. `POST` is the correct choice.

## 2. `aggregate` is a required method on `DatabaseAdapter`

Every adapter must implement `aggregate`. It is not optional.

```ts
interface DatabaseAdapter {
  aggregate(args: AggregateArgs): Promise<AggregateResult>;
  // ...existing methods
}
```

This means MongoDB, PostgreSQL, SQLite, and MySQL adapters must all be updated in the same pull request.

## 3. Access control reuses `access.read`

Aggregate uses the same `collection.access.read` gate as `find`:

1. If the caller is not allowed to read the collection, the aggregate request is rejected with `403`.
2. If `access.read` returns a row-level constraint, that constraint is merged into **every** named aggregate's `where` before the query reaches the database.

No separate `access.aggregate` key is introduced in v1.

## 4. All four database adapters must implement `aggregate`

MongoDB, PostgreSQL, SQLite, and MySQL must all implement the `aggregate` method. No adapter ships without it.

## 5. Return type is `number | null` for all operations

Every aggregate operation — `count`, `sum`, `avg`, `min`, `max` — returns `number | null`.

`null` is returned when there are no matching documents for `sum`, `avg`, `min`, and `max`. This is the correct and safe default.

The SDK and TypeScript types will reflect this:

```ts
const result = await client.collection("rsvp_records").aggregate({
  totalSubmitted: { count: "*" },
  totalAsoebiYards: { sum: "asoebiYards", cast: "number" },
});
// result: { totalSubmitted: number | null; totalAsoebiYards: number | null }
```

## 6. `cast` is not allowed on `count` operations

`cast` is a type-level error on `count`. It is only valid on `sum`, `avg`, `min`, and `max` — operations that read and transform a field value.

`count: "*"` counts documents. It does not read a field value, so casting has no effect. The TypeScript type definition will not include `cast` on the count operation shape, making it a compile-time error to specify it.

Filtering a `count` is done with `where`, not `cast`:

```ts
// Correct: filter using where
attending: {
  count: "*",
  where: {
    attending: { equals: true },
  },
}

// Compile error: cast is not valid on count
// total: { count: "*", cast: "number" }
```
