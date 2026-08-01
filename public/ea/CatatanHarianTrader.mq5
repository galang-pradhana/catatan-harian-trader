//+------------------------------------------------------------------+
//|                                     CatatanHarianTrader.mq5      |
//|                    Copyright 2026, Catatan Harian Trader         |
//|                           https://your-domain.vercel.app         |
//+------------------------------------------------------------------+
#property copyright "Catatan Harian Trader"
#property link      "https://your-domain.vercel.app"
#property version   "2.00"
#property description "EA Connector: Sinkronisasi otomatis trade MT5 ke aplikasi Catatan Harian Trader."

//--- Inputs
input string   InpApiToken        = "";               // API Token Unik (Salin dari Web Dashboard)
input string   InpServerUrl       = "https://your-domain.vercel.app"; // URL Server App
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
   Print("[CatatanHarianTrader] v2.0 Memulai EA Connector...");

   // Clean trailing slash from URL
   g_serverUrl = InpServerUrl;
   StringTrimRight(g_serverUrl);
   StringTrimLeft(g_serverUrl);
   if(StringSubstr(g_serverUrl, StringLen(g_serverUrl) - 1) == "/")
      g_serverUrl = StringSubstr(g_serverUrl, 0, StringLen(g_serverUrl) - 1);

   if(StringLen(InpApiToken) == 0)
   {
      Print("[CatatanHarianTrader] ERROR: API Token belum diisi!");
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
   Print("[CatatanHarianTrader] EA dihentikan. Alasan kode: ", reason);
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
   long   login   = AccountInfoInteger(ACCOUNT_LOGIN);
   string company = AccountInfoString(ACCOUNT_COMPANY);

   string jsonBody = StringFormat(
      "{\"token\":\"%s\",\"account_number\":\"%d\",\"broker_name\":\"%s\"}",
      InpApiToken, login, company
   );

   string endpoint = g_serverUrl + "/api/mt5/handshake";
   Print("[CatatanHarianTrader] Handshake -> ", endpoint);

   string response = "";
   int resCode = SendHttpPost(endpoint, jsonBody, response);

   if(resCode == 200)
   {
      g_isConnected = true;
      Print("[CatatanHarianTrader] Handshake OK: Akun #", login, " (", company, ") Terhubung.");
      return true;
   }
   else
   {
      g_isConnected = false;
      Print("[CatatanHarianTrader] Handshake GAGAL (HTTP ", resCode, "): ", response);
      return false;
   }
}

//+------------------------------------------------------------------+
//| Sync closed history + open positions ke server                   |
//+------------------------------------------------------------------+
void SyncTradeHistory()
{
   Print("[CatatanHarianTrader] Mulai sync trade history...");

   string tradesJson = "";
   int    tradeCount = 0;

   // ── 1. Closed Deals (History) ─────────────────────────────
   datetime fromTime = TimeCurrent() - (datetime)(InpHistoryDays * 86400);
   if(!HistorySelect(fromTime, TimeCurrent()))
   {
      Print("[CatatanHarianTrader] ERROR: HistorySelect gagal.");
      return;
   }

   int dealsTotal = HistoryDealsTotal();
   for(int i = 0; i < dealsTotal; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;

      // Only OUT deals represent trade closes
      ENUM_DEAL_ENTRY entryType = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket, DEAL_ENTRY);
      if(entryType != DEAL_ENTRY_OUT) continue;

      string  symbol      = HistoryDealGetString(ticket, DEAL_SYMBOL);
      int     dealType    = (int)HistoryDealGetInteger(ticket, DEAL_TYPE);
      double  volume      = HistoryDealGetDouble(ticket, DEAL_VOLUME);
      double  price       = HistoryDealGetDouble(ticket, DEAL_PRICE);
      double  pnl         = HistoryDealGetDouble(ticket, DEAL_PROFIT);
      double  commission  = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
      double  swap        = HistoryDealGetDouble(ticket, DEAL_SWAP);
      datetime closeTime  = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
      long   posId        = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);

      // Find entry (IN) deal for this position
      double  openPrice   = 0;
      datetime openTime   = 0;
      double  slVal       = 0;
      double  tpVal       = 0;

      for(int j = 0; j < dealsTotal; j++)
      {
         ulong tk2 = HistoryDealGetTicket(j);
         if(tk2 == 0) continue;
         ENUM_DEAL_ENTRY en2 = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(tk2, DEAL_ENTRY);
         if(en2 != DEAL_ENTRY_IN) continue;
         if(HistoryDealGetInteger(tk2, DEAL_POSITION_ID) != posId) continue;
         openPrice = HistoryDealGetDouble(tk2, DEAL_PRICE);
         openTime  = (datetime)HistoryDealGetInteger(tk2, DEAL_TIME);
         break;
      }

      // Determine direction: DEAL_TYPE_BUY = buy, DEAL_TYPE_SELL = sell
      string direction = (dealType == DEAL_TYPE_BUY) ? "sell" : "buy"; // OUT deal is opposite of entry

      string tradeItem = StringFormat(
         "{\"mt5_ticket_id\":%d,"
         "\"symbol\":\"%s\","
         "\"direction\":\"%s\","
         "\"volume\":%.2f,"
         "\"open_price\":%.5f,"
         "\"close_price\":%.5f,"
         "\"open_time\":\"%s\","
         "\"close_time\":\"%s\","
         "\"sl\":%.5f,"
         "\"tp\":%.5f,"
         "\"pnl\":%.2f,"
         "\"commission\":%.2f,"
         "\"swap\":%.2f,"
         "\"status\":\"closed\"}",
         (int)posId,
         symbol,
         direction,
         volume,
         openPrice,
         price,
         TimeToString(openTime, TIME_DATE | TIME_MINUTES | TIME_SECONDS),
         TimeToString(closeTime, TIME_DATE | TIME_MINUTES | TIME_SECONDS),
         slVal,
         tpVal,
         pnl,
         commission,
         swap
      );

      if(tradeCount > 0) tradesJson += ",";
      tradesJson += tradeItem;
      tradeCount++;
   }

   // ── 2. Open Positions ─────────────────────────────────────
   int posTotal = PositionsTotal();
   for(int i = 0; i < posTotal; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;

      string  symbol     = PositionGetString(POSITION_SYMBOL);
      int     posType    = (int)PositionGetInteger(POSITION_TYPE);
      double  volume     = PositionGetDouble(POSITION_VOLUME);
      double  openPrice  = PositionGetDouble(POSITION_PRICE_OPEN);
      double  sl         = PositionGetDouble(POSITION_SL);
      double  tp         = PositionGetDouble(POSITION_TP);
      double  pnl        = PositionGetDouble(POSITION_PROFIT);
      double  swap       = PositionGetDouble(POSITION_SWAP);
      datetime openTime  = (datetime)PositionGetInteger(POSITION_TIME);
      long    posId      = (long)PositionGetInteger(POSITION_IDENTIFIER);

      string direction = (posType == POSITION_TYPE_BUY) ? "buy" : "sell";

      string tradeItem = StringFormat(
         "{\"mt5_ticket_id\":%d,"
         "\"symbol\":\"%s\","
         "\"direction\":\"%s\","
         "\"volume\":%.2f,"
         "\"open_price\":%.5f,"
         "\"close_price\":null,"
         "\"open_time\":\"%s\","
         "\"close_time\":null,"
         "\"sl\":%.5f,"
         "\"tp\":%.5f,"
         "\"pnl\":%.2f,"
         "\"commission\":0,"
         "\"swap\":%.2f,"
         "\"status\":\"open\"}",
         (int)posId,
         symbol,
         direction,
         volume,
         openPrice,
         TimeToString(openTime, TIME_DATE | TIME_MINUTES | TIME_SECONDS),
         sl,
         tp,
         pnl,
         swap
      );

      if(tradeCount > 0) tradesJson += ",";
      tradesJson += tradeItem;
      tradeCount++;
   }

   if(tradeCount == 0)
   {
      Print("[CatatanHarianTrader] Tidak ada trade baru untuk disync.");
      return;
   }

   // ── 3. Send to /api/mt5/sync ──────────────────────────────
   string jsonBody = StringFormat(
      "{\"token\":\"%s\",\"trades\":[%s]}",
      InpApiToken, tradesJson
   );

   string endpoint = g_serverUrl + "/api/mt5/sync";
   string response = "";
   int resCode = SendHttpPost(endpoint, jsonBody, response);

   if(resCode == 200)
   {
      g_lastSyncTime = TimeCurrent();
      Print("[CatatanHarianTrader] Sync OK (", tradeCount, " trade). Response: ", response);
   }
   else
   {
      Print("[CatatanHarianTrader] Sync GAGAL (HTTP ", resCode, "): ", response);
      if(resCode == 401) g_isConnected = false; // Token revoked
   }
}

//+------------------------------------------------------------------+
//| Helper: HTTP POST via WebRequest                                  |
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
      resData = StringFormat("WebRequest error %d. Pastikan URL sudah diizinkan di Tools > Options > Experts.", err);
      return -1;
   }

   resData = CharArrayToString(result);
   return res;
}
