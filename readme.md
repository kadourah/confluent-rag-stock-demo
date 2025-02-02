## GENAI Application on Confluent Cloud and MongoDB


1. connect to your flink, from terminal where you have confluent cli:
```confluent flink connection create openai-vector-connection --cloud aws --region us-east-1 --environment env-v603np --type openai --endpoint https://api.openai.com/v1/embeddings --api-key <key>```

1. Open "SQL workspace"

![alt text](/images/image-1.png) 

1. Build stock-min-content table
```
CREATE TABLE `stock-min-content` (
    `stock_symbol` string,                 
    `stock_volume`   INT,                         
    `stock_accumulated_volume`        INT,                         
    `opening_price`  float,                      
    `volume_weighted_average_price` float,
    `price_agg` float,
    `closing_price_agg` float,
    `highest_tick_price_agg` float,
    `volume_avg_price_day` float,
    `avg_trade_size_agg` float,
    `content`      STRING
) WITH (
  'value.format' = 'json-registry'
);
```

2. Execute this query to populate the "stock-min-content" table
```
insert into `stock-min-content` (
   stock_symbol ,      
   opening_price,           
    stock_volume   ,                         
    stock_accumulated_volume,                                             
    volume_weighted_average_price ,
    price_agg ,
    closing_price_agg ,
    highest_tick_price_agg ,
    volume_avg_price_day ,
    avg_trade_size_agg ,
    content )
    select 
    sym,
    op,
    v, 
		av, 
		vw, 
		o,
		c, 
    h,
    a,
    z,     
CONCAT_WS('', 
        'Stock ', CAST(sym AS STRING), 
        ' had an average volume of ', CAST(v AS STRING), 
        ' shares, with an accumulated volume of ', CAST(av AS STRING), 
        '. The volume-weighted average price was $', CAST(vw AS STRING), 
        '. The opening price for this window was $', CAST(o AS STRING), 
        ', closing at $', CAST(c AS STRING), 
        ', with the highest tick price reaching $', CAST(h AS STRING), 
        '. The day''s VWAP was $', CAST(a AS STRING), 
        ', and the average trade size was ', CAST(z AS STRING), ' shares. ',
        'This data represents the aggregate window from ', 
        CAST(TO_TIMESTAMP_LTZ(s, 3) AS STRING), 
        ' to ', CAST(TO_TIMESTAMP_LTZ(e, 3) AS STRING), '.'
    ) AS content
from `ticker-agg-per-minute`
;
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
CREATE TABLE `stock-min-vector` (
    `stock_symbol` string,                 
    `stock_volume`   INT,                         
    `stock_accumulated_volume`        INT,                         
    `opening_price`  float,                      
    `volume_weighted_average_price` float,
    `price_agg` float,
    `closing_price_agg` float,
    `highest_tick_price_agg` float,
    `volume_avg_price_day` float,
    `avg_trade_size_agg` float,
    `content`      STRING,
    `vector`      ARRAY<FLOAT>
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