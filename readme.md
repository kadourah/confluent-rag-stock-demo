## commands to to run
1. Connect to flink `confluent flink shell --compute-pool lfcp-2dr322 --environment env-v603np` 
2. select * from  `stock-agg-per-minute`, lateral table (ml_predict('vector_encoding', 'sym'));
3. confluent flink connection create openai-vector-connection --cloud aws --region us-east-1 --environment env-v603np --type openai --endpoint https://api.openai.com/v1/embeddings --api-key <key>
   
4. CREATE MODEL `vector_encoding`
INPUT (input STRING)
OUTPUT (vector ARRAY<FLOAT>)
WITH(
  'TASK' = 'embedding',
  'PROVIDER' = 'openai',
  'OPENAI.CONNECTION' = 'openai-vector-connection',
  'OPENAI.model' ='text-embedding-ada-002'
);
1. `select * from  `stock-agg-per-minute`, lateral table (ml_predict('vector_encoding', 'sym'));`
2. CREATE TABLE `stock-min-content` (
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

1. 
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
     INITCAP(
		concat_ws('', 
   		', stock symbol: ' ||cast(sym as string),
			', stock average volume: '||cast(v as string),	
			', stock accumulated volume: '||cast(av as string),	
			', stock volume weighted average price: '||cast(vw as string),	
			', opening tick price for aggregate window: '||cast(o as string),	
      ', closing tick price for this aggregate window.: '||cast(c as string),	
      ', highest tick price for this aggregate window.: '||cast(h as string),	
      ', Today volume weighted average price: '||cast(a as string),	
      ', the average trade size for this aggregate window: '||cast(z as string),	
      ', The start timestamp of this aggregate window in Unix Milliseconds: '||cast(s as string),	
      ', The end timestamp of this aggregate window in Unix Milliseconds: '||cast(e as string)
		))
from `ticker-agg-per-minute`
;

1. CREATE TABLE `stock-min-vector` (
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

1. insert into `stock-min-vector` select * from `stock-min-content`, lateral table (ml_predict('vector_encoding', 'content'));