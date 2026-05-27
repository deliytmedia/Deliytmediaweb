# Deliytmedia Solutions - Complete System Setup

A full-stack website with Gemini-powered AI chatbot, automated lead management, and admin dashboard.

## 🚀 System Overview

### Tech Stack
- **Frontend**: HTML/CSS/JavaScript (Netlify hosting)
- **AI Backend**: Google Apps Script + Gemini API
- **Database**: Google Sheets
- **Email**: Resend API
- **Admin Dashboard**: Standalone HTML page

### Features
- ✅ Gemini AI-powered chatbot with function calling
- ✅ Conversation state management
- ✅ Lead scoring and qualification
- ✅ Appointment booking
- ✅ Knowledge base search
- ✅ Email escalation to human agents
- ✅ Admin dashboard for monitoring
- ✅ Mobile-responsive design
- ✅ Dark theme with lime green accents

---

## 📋 Setup Instructions

### Step 1: Get API Keys

#### 1.1 Gemini API Key (Free Tier Available)
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Get API Key"
3. Create a new API key or use existing
4. Copy the API key

#### 1.2 Resend API Key (Free Tier: 100 emails/day)
1. Go to [Resend](https://resend.com)
2. Sign up for free account
3. Go to API Keys section
4. Create new API key
5. Copy the API key

---

### Step 2: Setup Google Sheets Database

1. **Create New Google Sheet**
   - Go to [Google Sheets](https://sheets.google.com)
   - Create a new spreadsheet
   - Name it: "Deliytmedia Chatbot Database"

2. **Get Spreadsheet ID**
   - Look at the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit`
   - Copy the SPREADSHEET_ID part

3. **Create Sheets**
   The Apps Script will auto-create these sheets on first run:
   - Conversations (timestamp, conversation_id, role, message)
   - Appointments (appointment_id, name, email, phone, company, etc.)
   - Leads (timestamp, business_type, budget_range, score, priority)
   - Escalations (timestamp, reason, priority, customer_email, summary)

---

### Step 3: Deploy Google Apps Script Backend

1. **Open Apps Script**
   - In your Google Sheet, go to Extensions → Apps Script
   - Delete default code

2. **Paste Backend Code**
   - Copy all code from `backend-apps-script.gs`
   - Paste into Apps Script editor

3. **Configure API Keys**
   ```javascript
   const CONFIG = {
     GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE',
     RESEND_API_KEY: 'YOUR_RESEND_API_KEY_HERE',
     BUSINESS_EMAIL: 'hello@deliytmedia.com', // Change to your email
     SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE',
     GEMINI_MODEL: 'gemini-2.0-flash-exp' // Free tier compatible
   };
   ```

4. **Deploy as Web App**
   - Click "Deploy" → "New deployment"
   - Type: "Web app"
   - Execute as: "Me"
   - Who has access: "Anyone"
   - Click "Deploy"
   - Copy the Web App URL (looks like: `https://script.google.com/macros/s/...`)

5. **Authorize Permissions**
   - First run will ask for permissions
   - Review permissions
   - Click "Advanced" → "Go to [Project Name]"
   - Click "Allow"

---

### Step 4: Configure Frontend

1. **Update JavaScript Config**
   - Open `script.js`
   - Update the webhook URL:
   ```javascript
   const CONFIG = {
       appsScriptWebhook: 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE',
       conversationId: null
   };
   ```

---

### Step 5: Deploy to Netlify

#### Option A: Deploy via Netlify Drop (Easiest)

1. Go to [Netlify Drop](https://app.netlify.com/drop)
2. Drag and drop these files:
   - index.html
   - styles.css
   - script.js
3. Your site is live!

#### Option B: Deploy via GitHub

1. **Create GitHub Repository**
   ```bash
   git init
   git add index.html styles.css script.js
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Connect to Netlify**
   - Go to [Netlify](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub
   - Select your repository
   - Click "Deploy site"

3. **Custom Domain (Optional)**
   - In Netlify: Site settings → Domain management
   - Add custom domain
   - Update DNS records as instructed

---

### Step 6: Setup Admin Dashboard

1. **Update Dashboard Config**
   - Open `admin-dashboard.html`
   - Update configuration:
   ```javascript
   const CONFIG = {
       SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE',
       APPS_SCRIPT_URL: 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE'
   };
   ```

2. **Deploy Dashboard**
   - Upload `admin-dashboard.html` to Netlify as separate site
   - OR host on password-protected subdomain
   - Recommended: Add password protection in Netlify

3. **Secure the Dashboard**
   - In Netlify: Site settings → Visitor access
   - Set password protection
   - Only share credentials with team

---

### Step 7: Configure Email Domain (Resend)

1. **Add Domain to Resend**
   - Go to Resend Dashboard → Domains
   - Click "Add Domain"
   - Enter your domain (e.g., deliytmedia.com)

2. **Update DNS Records**
   - Add provided SPF, DKIM, DMARC records to your domain
   - Verify domain in Resend

3. **Update Apps Script Email**
   ```javascript
   const payload = {
     from: 'Chatbot <chatbot@yourdomain.com>', // Update this
     to: [to],
     subject: subject,
     text: body
   };
   ```

---

## 🧪 Testing the System

### Test 1: Chatbot Basic Functionality
1. Open your website
2. Click chat bubble
3. Send message: "Hi, what services do you offer?"
4. Verify bot responds with services list

### Test 2: Knowledge Base Search
1. Ask: "How much does a WhatsApp agent cost?"
2. Verify bot searches knowledge base and provides pricing

### Test 3: Appointment Booking
1. Say: "I want to book a strategy call"
2. Provide: Name, email, phone
3. Check Google Sheets → Appointments tab
4. Verify email notification sent

### Test 4: Lead Scoring
1. Have conversation mentioning:
   - Budget (₦1M+)
   - Timeline (urgent)
   - Pain points (missing customer inquiries)
2. Check Google Sheets → Leads tab
3. Verify lead scored as "hot"

### Test 5: Human Escalation
1. Ask complex question: "Can you integrate with Sage accounting?"
2. Verify bot escalates to human
3. Check email inbox for escalation notification

### Test 6: Admin Dashboard
1. Open admin dashboard
2. Verify stats display correctly
3. Check conversations list
4. Test filters and search

---

## 📊 Google Sheets Structure

### Conversations Sheet
| Timestamp | Conversation ID | Role | Message |
|-----------|----------------|------|---------|
| 2026-05-26T10:00:00Z | CONV_20260526_001 | user | Hi, what services do you offer? |
| 2026-05-26T10:00:05Z | CONV_20260526_001 | assistant | We offer WhatsApp Sales Agents... |

### Appointments Sheet
| Appointment ID | Name | Email | Phone | Company | Preferred Date | Status |
|----------------|------|-------|-------|---------|----------------|--------|
| APT_001 | John Doe | john@example.com | +234XXX | ABC Corp | 2026-06-01 | PENDING |

### Leads Sheet
| Timestamp | Business Type | Budget Range | Timeline | Score | Priority |
|-----------|---------------|--------------|----------|-------|----------|
| 2026-05-26 | E-commerce | ₦1M-₦2M | < 1 month | 85 | hot |

### Escalations Sheet
| Timestamp | Reason | Priority | Customer Email | Summary | Status |
|-----------|--------|----------|----------------|---------|--------|
| 2026-05-26 | complex_technical | high | john@example.com | Sage integration question | PENDING |

---

## 🎯 Gemini API Function Calling

The chatbot uses Gemini's function calling feature with these tools:

1. **search_knowledge_base** - Search company info
2. **estimate_project** - Calculate pricing estimates
3. **book_appointment** - Schedule strategy calls
4. **score_lead** - Qualify lead quality
5. **escalate_to_human** - Send to email

Example flow:
```
User: "How much for a WhatsApp chatbot?"
   ↓
Gemini calls: estimate_project(service_type="whatsapp_agent", complexity="standard")
   ↓
Function returns: {"min": 500000, "max": 1000000, "timeline": "3-4 weeks"}
   ↓
Gemini responds: "For a standard WhatsApp Sales Agent, we're looking at ₦500k-₦1M. Timeline is 3-4 weeks..."
```

---

## 🔧 Customization

### Update Knowledge Base
Edit in `backend-apps-script.gs`:
```javascript
const knowledgeBase = {
  services: {
    whatsapp: "Your updated description here...",
    saas: "Your updated description here..."
  },
  pricing: {
    basic: "Your pricing info here..."
  }
};
```

### Adjust Pricing Estimates
Edit in `estimateProject()` function:
```javascript
const pricing = {
  whatsapp_agent: {
    basic: { min: 200000, max: 500000, timeline: "2-3 weeks" }
    // Update values here
  }
};
```

### Change System Prompt
Edit `SYSTEM_PROMPT` constant to change chatbot personality and behavior.

### Customize UI Colors
Edit CSS variables in `styles.css`:
```css
:root {
    --lime-primary: #BFFF00; /* Change to your brand color */
    --purple-primary: #667eea;
    /* etc. */
}
```

---

## 🐛 Troubleshooting

### Chatbot Not Responding
1. Check browser console for errors
2. Verify Apps Script webhook URL is correct
3. Test Apps Script directly: Run `testGeminiConnection()` in Apps Script editor
4. Check Gemini API quota: https://aistudio.google.com/app/apikey

### Email Not Sending
1. Verify Resend API key is correct
2. Check domain is verified in Resend
3. Check email logs in Resend dashboard
4. Verify sender email format: `Name <email@yourdomain.com>`

### Conversations Not Saving
1. Check Spreadsheet ID is correct
2. Verify Apps Script has permission to access Sheet
3. Check Apps Script logs: View → Logs
4. Manually run `initializeSheet()` to create sheets

### Gemini API Errors
- **"API key not valid"**: Check API key is correct and active
- **"Quota exceeded"**: You've hit free tier limit (switch to paid or wait)
- **"Model not found"**: Use `gemini-2.0-flash-exp` or `gemini-1.5-flash`

---

## 📈 Monitoring & Analytics

### Apps Script Logs
- In Apps Script: View → Executions
- See all webhook calls, errors, function executions

### Conversation Analytics
- Total conversations: Count rows in Conversations sheet
- Hot leads: Filter Leads sheet by priority = "hot"
- Conversion rate: Appointments / Total conversations

### Email Deliverability
- Check Resend dashboard for delivery rates
- Monitor bounces and spam reports

---

## 🔐 Security Best Practices

1. **Never commit API keys to GitHub**
   - Use environment variables in production
   - Add `.env` file to `.gitignore`

2. **Password-protect admin dashboard**
   - Use Netlify password protection
   - Or implement proper authentication

3. **Limit Apps Script access**
   - Use "Execute as me" + "Anyone" for webhook
   - Restrict Sheet editing to authorized users only

4. **Monitor for abuse**
   - Check Apps Script execution logs regularly
   - Set up alerts for unusual activity

---

## 💰 Cost Breakdown

### Free Tier (Recommended for Starting)
- Gemini API: Free tier (60 requests/minute)
- Google Sheets: Free
- Google Apps Script: Free
- Netlify: Free (100GB bandwidth/month)
- Resend: Free (100 emails/day)
- **Total: ₦0/month**

### Paid Tier (If You Scale)
- Gemini API: Pay-as-you-go ($0.00015/1K chars)
- Resend: $20/month (50K emails)
- Netlify Pro: $19/month (400GB bandwidth)
- **Estimated: ₦15,000-₦30,000/month** (depending on traffic)

---

## 📞 Support

For issues with this setup:
1. Check Google Sheets for error logs
2. Review Apps Script execution logs
3. Test individual functions in Apps Script
4. Check browser console for frontend errors

---

## 🚀 Next Steps After Setup

1. **Test thoroughly** - Run all test scenarios
2. **Customize copy** - Update knowledge base with your actual services
3. **Train the bot** - Add more Q&A patterns to knowledge base
4. **Monitor conversations** - Check admin dashboard daily for first week
5. **Iterate** - Adjust system prompt based on real conversations
6. **Scale** - Move to paid tiers when traffic increases

---

## 📄 Files Included

- `index.html` - Main website
- `styles.css` - Styling and animations
- `script.js` - Frontend chat logic
- `backend-apps-script.gs` - Backend with Gemini integration
- `admin-dashboard.html` - Admin monitoring interface
- `README.md` - This setup guide

---

**Built for Deliytmedia Solutions by Isaiah**  
Version 1.0 | May 2026