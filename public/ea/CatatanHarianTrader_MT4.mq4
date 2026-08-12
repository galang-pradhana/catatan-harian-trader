//+------------------------------------------------------------------+
//|                                 CatatanHarianTrader_MT4.mq4      |
//|                    Copyright 2026, Catatan Harian Trader         |
//|                           https://www.chtrader.web.id            |
//+------------------------------------------------------------------+
#property copyright "Catatan Harian Trader"
#property link      "https://www.chtrader.web.id"
#property version   "1.00"
#property description "EA Connector MT4 v1.00: Auto Sync MT4 Trades + Open Positions + Balance."
#property strict

//--- Inputs
input string   InpApiToken        = "";               // API Token Unik (Salin dari Web Dashboard)
input string   InpServerUrl       = "https://www.chtrader.web.id"; // URL Server App (Production)
input int      InpSyncIntervalSec = 120;              // Interval Auto Sync (Detik, default: 120)
input int      InpHistoryDays     = 30;               // Ambil history berapa hari ke belakang

//--- Global Variables
datetime g_lastSyncTime = 0;
bool     g_isConnected  = false;
string   g_serverUrl    = "";

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("[CatatanHarianTrader MT4] Memulai EA Connector MT4 v1.00...");

   // Clean trailing slash from URL
   g_serverUrl = InpServerUrl;
   StringTrimRight(g_serverUrl);
   StringTrimLeft(g_serverUrl);
   if(StringLen(g_serverUrl) > 0 && StringSubstr(g_serverUrl, StringLen(g_serverUrl) - 1) == "/")
      g_serverUrl = StringSubstr(g_serverUrl, 0, StringLen(g_serverUrl) - 1);

   if(StringLen(InpApiToken) == 0)
   {
      Print("[CatatanHarianTrader MT4] ERROR: API Token belum diisi!");
      return(INIT_PARAMETERS_INCORRECT);
   }

   // Set background sync timer
   EventSetTimer(InpSyncIntervalSec);

   // Immediate handshake + first sync
   if(PerformHandshake())
      SyncTradeHistory();

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("[CatatanHarianTrader MT4] EA dihentikan. Alasan kode: ", reason);
}

//+------------------------------------------------------------------+
//| Timer — fires every InpSyncIntervalSec seconds                  |
//+------------------------------------------------------------------+
void OnTimer()
{
   if(!g_isConnected)
   {
      if(PerformHandshake())
         SyncTradeHistory();
   }
   else
   {
      SyncTradeHistory();
   }
}

//+------------------------------------------------------------------+
//| Handshake dengan server                                          |
//+------------------------------------------------------------------+
bool PerformHandshake()
{
   long   login   = AccountNumber();
   string company = AccountCompany();

   string jsonBody = StringFormat(
      "{\"token\":\"%s\",\"account_number\":\"%d\",\"broker_name\":\"%s\",\"platform\":\"mt4\"}",
      InpApiToken, login, company
   );

   string endpoint = g_serverUrl + "/api/mt5/handshake";
   Print("[CatatanHarianTrader MT4] Handshake -> ", endpoint);

   string response = "";
   int resCode = SendHttpPost(endpoint, jsonBody, response);

   if(resCode == 200)
   {
      g_isConnected = true;
      Print("[CatatanHarianTrader MT4] Handshake OK: Akun MT4 #", login, " (", company, ") Terhubung.");
      return true;
   }
   else
   {
      g_isConnected = false;
      Print("[CatatanHarianTrader MT4] Handshake GAGAL (HTTP ", resCode, "): ", response);
      return false;
   }
}

//+------------------------------------------------------------------+
//| Helper: Format datetime to ISO 8601 in MQL4                     |
//+------------------------------------------------------------------+
string FormatISO8601(datetime dt)
{
   if(dt <= 0) return "null";
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02d+00:00",
      TimeYear(dt), TimeMonth(dt), TimeDay(dt),
      TimeHour(dt), TimeMinute(dt), TimeSeconds(dt));
}

//+------------------------------------------------------------------+
//| Sync closed history + open positions ke server                   |
//+------------------------------------------------------------------+
void SyncTradeHistory()
{
   Print("[CatatanHarianTrader MT4] Mulai sync trade history & open positions...");

   string tradesJson = "";
   int    tradeCount = 0;

   // ── 1. Closed Orders (History) ────────────────────────────
   datetime fromTime = TimeCurrent() - (datetime)(InpHistoryDays * 86400);
   int historyTotal = OrdersHistoryTotal();

   for(int i = 0; i < historyTotal; i++)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;

      int orderType = OrderType();
      if(orderType != OP_BUY && orderType != OP_SELL) continue; // Skip pending orders & balance transactions

      datetime closeTime = OrderCloseTime();
      if(closeTime < fromTime) continue; // Filter by time window

      long     ticket     = OrderTicket();
      string   symbol     = OrderSymbol();
      double   volume     = OrderLots();
      double   openPrice  = OrderOpenPrice();
      double   closePrice = OrderClosePrice();
      datetime openTime   = OrderOpenTime();
      double   sl         = OrderStopLoss();
      double   tp         = OrderTakeProfit();
      double   pnl        = OrderProfit();
      double   commission = OrderCommission();
      double   swap       = OrderSwap();

      string direction = (orderType == OP_BUY) ? "buy" : "sell";

      string openTimeISO  = FormatISO8601(openTime);
      string closeTimeISO = FormatISO8601(closeTime);

      string slStr = (sl > 0) ? StringFormat("%.5f", sl) : "null";
      string tpStr = (tp > 0) ? StringFormat("%.5f", tp) : "null";

      string tradeItem = StringFormat(
         "{\"mt5_ticket_id\":%d,"
         "\"symbol\":\"%s\","
         "\"direction\":\"%s\","
         "\"volume\":%.2f,"
         "\"open_price\":%.5f,"
         "\"close_price\":%.5f,"
         "\"open_time\":\"%s\","
         "\"close_time\":\"%s\","
         "\"sl\":%s,"
         "\"tp\":%s,"
         "\"pnl\":%.2f,"
         "\"commission\":%.2f,"
         "\"swap\":%.2f,"
         "\"mfe_value\":null,"
         "\"status\":\"closed\"}",
         ticket,
         symbol,
         direction,
         volume,
         openPrice,
         closePrice,
         openTimeISO,
         closeTimeISO,
         slStr,
         tpStr,
         pnl,
         commission,
         swap
      );

      if(tradeCount > 0) tradesJson += ",";
      tradesJson += tradeItem;
      tradeCount++;
   }

   // ── 2. Open Positions (Active Trades) ─────────────────────
   int openTotal = OrdersTotal();
   for(int i = 0; i < openTotal; i++)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;

      int orderType = OrderType();
      if(orderType != OP_BUY && orderType != OP_SELL) continue; // Skip pending orders

      long     ticket     = OrderTicket();
      string   symbol     = OrderSymbol();
      double   volume     = OrderLots();
      double   openPrice  = OrderOpenPrice();
      datetime openTime   = OrderOpenTime();
      double   sl         = OrderStopLoss();
      double   tp         = OrderTakeProfit();
      double   pnl        = OrderProfit();
      double   commission = OrderCommission();
      double   swap       = OrderSwap();

      string direction = (orderType == OP_BUY) ? "buy" : "sell";
      string openTimeISO = FormatISO8601(openTime);

      string slStr = (sl > 0) ? StringFormat("%.5f", sl) : "null";
      string tpStr = (tp > 0) ? StringFormat("%.5f", tp) : "null";

      string tradeItem = StringFormat(
         "{\"mt5_ticket_id\":%d,"
         "\"symbol\":\"%s\","
         "\"direction\":\"%s\","
         "\"volume\":%.2f,"
         "\"open_price\":%.5f,"
         "\"close_price\":null,"
         "\"open_time\":\"%s\","
         "\"close_time\":null,"
         "\"sl\":%s,"
         "\"tp\":%s,"
         "\"pnl\":%.2f,"
         "\"commission\":%.2f,"
         "\"swap\":%.2f,"
         "\"mfe_value\":null,"
         "\"status\":\"open\"}",
         ticket,
         symbol,
         direction,
         volume,
         openPrice,
         openTimeISO,
         slStr,
         tpStr,
         pnl,
         commission,
         swap
      );

      if(tradeCount > 0) tradesJson += ",";
      tradesJson += tradeItem;
      tradeCount++;
   }

   if(tradeCount == 0)
   {
      Print("[CatatanHarianTrader MT4] Tidak ada trade untuk disync.");
      return;
   }

   // ── 3. Send Payload to /api/mt5/sync ──────────────────────
   double currentBalance = AccountBalance();
   string jsonBody = StringFormat(
      "{\"token\":\"%s\",\"balance\":%.2f,\"trades\":[%s]}",
      InpApiToken, currentBalance, tradesJson
   );

   string endpoint = g_serverUrl + "/api/mt5/sync";
   string response = "";
   int resCode = SendHttpPost(endpoint, jsonBody, response);

   if(resCode == 200)
   {
      g_lastSyncTime = TimeCurrent();
      Print("[CatatanHarianTrader MT4] Sync OK (", tradeCount, " trade). Response: ", response);
   }
   else
   {
      Print("[CatatanHarianTrader MT4] Sync GAGAL (HTTP ", resCode, "): ", response);
      if(resCode == 401) g_isConnected = false;
   }
}

//+------------------------------------------------------------------+
//| Helper: HTTP POST via WebRequest (MQL4 native)                   |
//+------------------------------------------------------------------+
int SendHttpPost(string url, string jsonBody, string &resData)
{
   char   data[];
   char   result[];
   string resultHeaders;
   string headers = "Content-Type: application/json\r\n";

   StringToCharArray(jsonBody, data, 0, StringLen(jsonBody));

   ResetLastError();
   int res = WebRequest("POST", url, headers, 10000, data, result, resultHeaders);

   if(res == -1)
   {
      int err = GetLastError();
      resData = StringFormat("WebRequest error %d. Pastikan URL sudah diizinkan di Tools > Options > Expert Advisors.", err);
      return -1;
   }

   resData = CharArrayToString(result);
   return res;
}
