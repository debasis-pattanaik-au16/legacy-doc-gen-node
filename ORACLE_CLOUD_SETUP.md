# Oracle Cloud Object Storage Setup Guide

This guide will walk you through setting up Oracle Cloud Object Storage for the Legacy Doc Generator application.

---

## 📋 Prerequisites

- Oracle Cloud Account ([Sign up here](https://www.oracle.com/cloud/free/))
- Admin access to create buckets and generate API credentials

---

## 🪣 Step 1: Create Object Storage Bucket

1. **Login to Oracle Cloud Console**
   - Go to https://cloud.oracle.com
   - Sign in with your credentials

2. **Navigate to Object Storage**
   - Click the hamburger menu (☰) in top left
   - Select **Storage** → **Object Storage & Archive Storage** → **Buckets**

3. **Create Bucket**
   - Click **Create Bucket**
   - Fill in the details:
     ```
     Bucket Name: legacy-doc-storage
     Default Storage Tier: Standard
     Encryption: Encrypt using Oracle-managed keys (default)
     ```
   - **IMPORTANT**: Set **Visibility** to **Private** (not public)
   - Click **Create**

4. **Note the Namespace**
   - At the top of the bucket details page, you'll see your **Namespace**
   - Save this value - you'll need it for configuration
   - Example: `axwhateverxyz`

---

## 🔑 Step 2: Generate API Credentials

### Option A: API Key Authentication (Recommended)

1. **Open User Settings**
   - Click on your profile icon (top right)
   - Select **User Settings**

2. **Generate API Key**
   - Scroll down to **Resources** on the left
   - Click **API Keys**
   - Click **Add API Key**

3. **Download or Generate Key Pair**
   - Select **Generate API Key Pair**
   - Click **Download Private Key** (saves as `.pem` file)
   - Click **Download Public Key** (optional, for backup)
   - Click **Add**

4. **Copy Configuration Values**
   - You'll see a configuration file preview with:
     ```
     [DEFAULT]
     user=ocid1.user.oc1..aaaaa...
     fingerprint=aa:bb:cc:dd:ee...
     tenancy=ocid1.tenancy.oc1..aaaaa...
     region=us-phoenix-1
     key_file=<path to your private keyfile>
     ```
   - **Save these values** - you'll need them

5. **Store Private Key Securely**
   - Move the downloaded `.pem` file to a secure location
   - Example: `/Users/debasis/.oci/legacy-doc-key.pem`
   - Set proper permissions (macOS/Linux):
     ```bash
     chmod 600 /Users/debasis/.oci/legacy-doc-key.pem
     ```

---

## 📝 Step 3: Collect Required Information

You should now have the following information:

| Variable | Value | Where to Find |
|----------|-------|---------------|
| **Namespace** | `axwhateverxyz` | Top of bucket page |
| **Bucket Name** | `legacy-doc-storage` | What you named the bucket |
| **Region** | `us-phoenix-1` | From API key config |
| **Tenancy OCID** | `ocid1.tenancy.oc1..aaaaa...` | From API key config |
| **User OCID** | `ocid1.user.oc1..aaaaa...` | From API key config |
| **Fingerprint** | `aa:bb:cc:dd:ee...` | From API key config |
| **Private Key Path** | `/path/to/key.pem` | Where you saved the key |

---

## ⚙️ Step 4: Configure Environment Variables

1. **Create `.env` file in Backend directory** (if not exists)
   ```bash
   cd Backend
   touch .env
   ```

2. **Add Storage Configuration**
   
   Open `Backend/.env` and add:

   ```bash
   # ============================================
   # CLOUD STORAGE CONFIGURATION
   # ============================================
   
   # Storage Provider: 'local' | 'oracle_cloud' | 'aws_s3' | 'azure_blob'
   STORAGE_PROVIDER=oracle_cloud
   
   # Oracle Cloud Object Storage
   OCI_NAMESPACE=your_namespace_here
   OCI_BUCKET_NAME=legacy-doc-storage
   OCI_REGION=us-phoenix-1
   OCI_TENANCY_ID=ocid1.tenancy.oc1..aaaaa...
   OCI_USER_ID=ocid1.user.oc1..aaaaa...
   OCI_FINGERPRINT=aa:bb:cc:dd:ee...
   OCI_PRIVATE_KEY_PATH=/path/to/your/key.pem
   
   # Public URL settings
   OCI_PUBLIC_URL_EXPIRY=3600  # 1 hour in seconds
   
   # ============================================
   # FUTURE: AWS S3 Configuration (when switching)
   # ============================================
   # AWS_S3_BUCKET=
   # AWS_REGION=
   # AWS_ACCESS_KEY_ID=
   # AWS_SECRET_ACCESS_KEY=
   # AWS_URL_EXPIRY=3600
   ```

3. **Replace Placeholder Values**
   - Replace `your_namespace_here` with your actual namespace
   - Replace all `ocid1...` values with your actual OCIDs
   - Replace fingerprint with your actual fingerprint
   - Update the private key path

---

## 🔐 Step 5: Set Up Bucket Policies (Optional but Recommended)

For better security, create a policy that allows your user to access only this bucket:

1. **Navigate to Policies**
   - Menu → Identity & Security → Policies
   
2. **Create Policy**
   - Click **Create Policy**
   - Name: `legacy-doc-storage-policy`
   - Description: `Allow access to legacy documentation storage bucket`
   
3. **Add Policy Statements**
   ```
   Allow group Administrators to manage object-family in compartment id [your-compartment-id] where target.bucket.name='legacy-doc-storage'
   ```

---

## ✅ Step 6: Verify Setup

### Test Connection (Manual)

1. **Test via OCI CLI** (optional)
   ```bash
   # Install OCI CLI
   brew install oci-cli  # macOS
   
   # Configure
   oci setup config
   
   # Test bucket access
   oci os bucket get --bucket-name legacy-doc-storage --namespace your_namespace
   ```

### Test via Application

Once you complete Phase 2 implementation, you can test with:

```bash
npm run test:cloud-storage
```

---

## 🔄 Step 7: Enable Lifecycle Policies (Optional)

To automatically delete old documentation after 90 days:

1. **Go to your bucket**
2. **Click on Lifecycle Policy Rules**
3. **Create Rule**
   ```
   Name: delete-old-docs
   Object Name Prefix: projects/
   Days after creation: 90
   Action: Delete
   ```

---

## 📊 Step 8: Monitor Usage and Costs

1. **Set up Budget Alerts**
   - Menu → Billing & Cost Management → Budgets
   - Create budget alert for storage costs

2. **Monitor Usage**
   - Check bucket metrics in OCI Console
   - View storage size and request counts

---

## 🚨 Troubleshooting

### Error: "The user does not have permission"
- Check that your user has proper permissions
- Verify the policy is attached to your user/group

### Error: "Invalid key fingerprint"
- Ensure fingerprint matches exactly
- Check for extra spaces or newlines

### Error: "Key file not found"
- Verify the private key path is correct
- Check file permissions (should be 600)

### Error: "Namespace not found"
- Double-check the namespace value
- It's case-sensitive

---

## 🔐 Security Best Practices

1. **Never commit credentials to Git**
   - Add `.env` to `.gitignore` (already done)
   - Use environment variables or secrets manager

2. **Rotate API Keys Regularly**
   - Generate new keys every 90 days
   - Delete old keys

3. **Use Principle of Least Privilege**
   - Grant only necessary permissions
   - Use separate users for different environments

4. **Enable MFA**
   - Enable multi-factor authentication on your Oracle Cloud account

5. **Monitor Access Logs**
   - Review bucket access logs regularly
   - Set up alerts for suspicious activity

---

## 📚 Additional Resources

- [Oracle Cloud Object Storage Documentation](https://docs.oracle.com/en-us/iaas/Content/Object/home.htm)
- [OCI SDK for TypeScript](https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/typescriptsdk.htm)
- [API Key Authentication](https://docs.oracle.com/en-us/iaas/Content/API/Concepts/apisigningkey.htm)

---

## ✅ Setup Checklist

- [ ] Oracle Cloud account created
- [ ] Bucket created with name `legacy-doc-storage`
- [ ] Bucket visibility set to **Private**
- [ ] API key pair generated
- [ ] Private key downloaded and secured
- [ ] All OCIDs and credentials noted
- [ ] `.env` file updated with all values
- [ ] Private key permissions set (chmod 600)
- [ ] Bucket policies configured (optional)
- [ ] Lifecycle policies set up (optional)
- [ ] Budget alerts configured (optional)

---

**Next Steps**: Once you've completed this setup, proceed to Phase 2 in the implementation to create the storage abstraction layer.

**Need Help?** Check the troubleshooting section above or consult Oracle Cloud support.
