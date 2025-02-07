## GENAI Application on Confluent Cloud and MongoDB


1. connect to your flink, from terminal where you have confluent cli:
```confluent flink connection create openai-vector-connection --cloud aws --region us-east-1 --environment env-v603np --type openai --endpoint https://api.openai.com/v1/embeddings --api-key <key>```

1. Open "SQL workspace"

![alt text](/images/image-1.png) 

1. Build stock-min-content table
```


CREATE TABLE `stock-quote-content` (
    `stock_symbol` string,                           
    `bid_price` float,                         
    `bid_size`  int,                      
    `ask_price` float,
    `ask_size` int,
    `trans_datetime` string,
    `content`      STRING
) WITH (
  'value.format' = 'json-registry'
);


```



2. Execute this query to populate the "stock-min-content" table
```


insert into `stock-quote-content'
(stock_symbol,
bid_size,
bid_price,
ask_size,
trans_datetime,
content


)


select sym, bs, bp, `as`, `ap`, CAST(TO_TIMESTAMP_LTZ(t, 3) AS STRING), 
  CONCAT_WS('', 
  ' Stock Symbol: ', CAST(sym AS STRING), 
  ' Bid Price : ', CAST(bp AS STRING), 
   ' Ask Price : ', CAST(`ap` AS STRING), 
  ' Transaction Time : ',CAST(TO_TIMESTAMP_LTZ(t, 3) AS STRING)
  )

from  `stock_quotes`


```
3. Create Model
``` 
CREATE MODEL `vector_encoding`
INPUT (input STRING)
OUTPUT (vector ARRAY<FLOAT>)
WITH(
  'TASK' = 'embedding',
  'PROVIDER' = 'openai',
  'OPENAI.CONNECTION' = 'openai-vector-connection',
  'OPENAI.MODEL_VERSION' ='text-embedding-ada-002'
);
```

4. Create vector table
```

CREATE TABLE `stock-quote-vector` (
    `stock_symbol` string,                           
    `bid_price` float,                         
    `bid_size`  int,                      
    `ask_price` float,
    `ask_size` int,
    `trans_datetime` string,
    `content`      STRING,
    `vector`      array<float>
  
) WITH (
  'value.format' = 'json-registry'
);


```


5. Generate Embedding
```
insert into `stock-min-vector` select * from `stock-min-content`, lateral table (ml_predict('vector_encoding', 'content'));
```   

6. Populate "stock-min-vector" table:
```
insert into `stock-min-vector` select * from `stock-min-content`, lateral table (ml_predict('vector_encoding', 'content'));
```