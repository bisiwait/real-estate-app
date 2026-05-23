# Twilio WhatsApp（B2B エージェント通知）

このアプリでは [Twilio WhatsApp](https://www.twilio.com/docs/whatsapp) を使ってエージェントへ通知できます。

## 環境変数（`.env.local` / Vercel）

| 変数 | 説明 |
|------|------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_WHATSAPP_FROM` | 送信元。例 `whatsapp:+14155238886`（サンドボックス）または承認済みビジネス番号 |
| `WHATSAPP_SEND_API_SECRET` | `POST /api/whatsapp/send` の `Authorization: Bearer …` で検証 |
| `WHATSAPP_WEBHOOK_SECRET` | `POST /api/webhooks/whatsapp-supabase` で検証 |

任意:

- `WHATSAPP_NOTIFY_MATCHING_AGENTS=true` … **同一エリア近辺に興味を持っている他エージェント**にも簡易通知（プロフィールの `target_area` とエリア名の部分一致）。
- Bearer に `SUPABASE_SERVICE_ROLE_KEY` をそのまま使うことでも `/api/whatsapp/send` を呼べますが、権限が強すぎるため本番では専用の `WHATSAPP_SEND_API_SECRET` を推奨します。

## API

### `POST /api/whatsapp/send`

- **認証**: `Authorization: Bearer <WHATSAPP_SEND_API_SECRET>` またはサービスロールキー。
- **Body**（どちらか一方）:

```json
{ "agentId": "<profiles.id の UUID>", "message": "本文" }
```

```json
{ "toNumber": "0812345678", "message": "本文" }
```

電話はタイの携帯 `08xxxxxxxx` と E.164 `+668…` に対応。`profiles.phone` から `agentId` 指定で送信するときにも同様に正規化されます。

### `POST /api/webhooks/whatsapp-supabase`

Supabase **Database Webhooks** から呼ぶ想定です。

1. Dashboard → Database → Webhooks → New webhook  
2. テーブル: `properties`  
3. イベント: Insert（および公開通知を送りたい場合は Update も）  
4. Target URL: `https://あなたのドメイン/api/webhooks/whatsapp-supabase`  
5. Header: `Authorization: Bearer <WHATSAPP_WEBHOOK_SECRET>` と同値の Bearer を設定  

**処理内容**

- **INSERT**: 物件所有者（`properties.user_id`）のエージェントに、その物件が作成された旨の短文を送信。  
- **UPDATE**: `status` が `published` に変わったときに「公開」を通知。  
- オプションで `WHATSAPP_NOTIFY_MATCHING_AGENTS=true` のときマッチング向け送信。

PostgreSQL にトリガー関数を増やしたい場合でも、運用開始は Dashboard の Webhooks で十分です。

## 開発メモ

- Twilio Sandbox では、送信先ユーザーが Sandbox に opt-in（キーワード送信）済みである必要があります。  
- 送信ログはサーバー側 `console.log` に `[whatsapp]` プレフィックスで出ます。
