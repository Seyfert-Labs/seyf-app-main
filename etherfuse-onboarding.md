> ## Documentation Index

> Fetch the complete documentation index at: [https://docs.etherfuse.com/llms.txt](https://docs.etherfuse.com/llms.txt)

> Use this file to discover all available pages before exploring further.

# Onboard — Programmatic

> Onboard customers via API for a white-label experience

Programmatic KYC allows you to collect identity data in your own UI and submit it via API, bypassing the Etherfuse-hosted verification page. This is ideal for white-label integrations where the customer never leaves your app.



  **Onboarding a business?** Use [POST /ramp/organization](/api-reference/organizations/create-a-child-organization) to create a child organization, then have Etherfuse KYB-approve it. KYB-approved orgs are fully compliant — no individual KYC, document uploads, or agreement signing required. The flow below is for onboarding individual customers.





  **Supported blockchains:** The `blockchain` field accepts `solana`, `stellar`, `base`, `polygon`, or `monad`. All examples use Solana, but the flow works identically across chains.





  **Two types of auth** are used throughout this flow:

- **Steps 1–5** use your **API key** with the `customer_id` in the URL path
- **Step 6** uses the **presigned URL** as the authentication token (no API key)



## Flow





```
<Expandable title="Details">

  Create a child organization for your customer. You can optionally include wallets and a bank account to set everything up in a single call. See [POST /ramp/organization](/api-reference/organizations/create-a-child-organization) for the full schema.

  <CodeGroup>

    ```bash Sandbox theme={null}

    curl -X POST [https://api.sand.etherfuse.com/ramp/organization](https://api.sand.etherfuse.com/ramp/organization) \

      -H "Authorization: <api_key>" \

      -H "Content-Type: application/json" \

      -d '{

        "id": "<customer_uuid>",

        "displayName": "Customer Name",

        "wallets": [

          {

            "publicKey": "<wallet_public_key>",

            "blockchain": "solana"

          }

        ]

      }'

    ```

    ```bash Production theme={null}

    curl -X POST [https://api.etherfuse.com/ramp/organization](https://api.etherfuse.com/ramp/organization) \

      -H "Authorization: <api_key>" \

      -H "Content-Type: application/json" \

      -d '{

        "id": "<customer_uuid>",

        "displayName": "Customer Name",

        "wallets": [

          {

            "publicKey": "<wallet_public_key>",

            "blockchain": "solana"

          }

        ]

      }'

    ```

  </CodeGroup>

  **Response:**

  ```json theme={null}

  {

    "organizationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",

    "displayName": "Customer Name",

    "wallets": [

      {

        "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",

        "publicKey": "9Qx7r...",

        "blockchain": "solana"

      }

    ],

    "bankAccount": null

  }

  ```

  <Info>

    **Business customers?** If Etherfuse KYB-approves the child organization, it is fully compliant — skip the remaining steps. The KYC, document, agreement, and presigned URL steps below are only needed for individual customers.

  </Info>

  <Tip>

    **Partner fees:** To set a default partner fee for this child org, add `"partnerFeeDefaultBps": 100` (0–500 bps) to the request body. This fee layers on top of platform fees for all quotes under this org. See [Partner Fees](/overview#partner-fees).

  </Tip>

</Expandable>
```





```
<Expandable title="Details">

  Submit the customer's identity information via your API key. The `pubkey` field is the wallet public key (not a UUID). See [POST /ramp/customer/\{id}/kyc](/api-reference/kyc/submit-kyc-identity-data) for the full schema.

  <CodeGroup>

    ```bash Sandbox theme={null}

    curl -X POST [https://api.sand.etherfuse.com/ramp/customer/<customer_uuid>/kyc](https://api.sand.etherfuse.com/ramp/customer/<customer_uuid>/kyc) \

      -H "Authorization: <api_key>" \

      -H "Content-Type: application/json" \

      -d '{

        "pubkey": "<wallet_public_key>",

        "identity": {

          "id": "<wallet_public_key>",

          "email": "[juan@example.com](mailto:juan@example.com)",

          "phoneNumber": "+521234567890",

          "occupation": "Software Engineer",

          "name": {

            "givenName": "Juan",

            "familyName": "Garcia"

          },

          "dateOfBirth": "1990-05-15",

          "address": {

            "street": "Av. Reforma 123",

            "city": "Mexico City",

            "region": "CDMX",

            "postalCode": "06600",

            "country": "MX"

          },

          "idNumbers": [

            { "value": "GAJU900515HDFRNN09", "type": "CURP" },

            { "value": "GAJU9005156V3", "type": "RFC" }

          ]

        }

      }'

    ```

    ```bash Production theme={null}

    curl -X POST [https://api.etherfuse.com/ramp/customer/<customer_uuid>/kyc](https://api.etherfuse.com/ramp/customer/<customer_uuid>/kyc) \

      -H "Authorization: <api_key>" \

      -H "Content-Type: application/json" \

      -d '{

        "pubkey": "<wallet_public_key>",

        "identity": {

          "id": "<wallet_public_key>",

          "email": "[juan@example.com](mailto:juan@example.com)",

          "phoneNumber": "+521234567890",

          "occupation": "Software Engineer",

          "name": {

            "givenName": "Juan",

            "familyName": "Garcia"

          },

          "dateOfBirth": "1990-05-15",

          "address": {

            "street": "Av. Reforma 123",

            "city": "Mexico City",

            "region": "CDMX",

            "postalCode": "06600",

            "country": "MX"

          },

          "idNumbers": [

            { "value": "GAJU900515HDFRNN09", "type": "CURP" },

            { "value": "GAJU9005156V3", "type": "RFC" }

          ]

        }

      }'

    ```

  </CodeGroup>

  <Expandable title="Required fields reference">

    When the customer signs their agreement (Step 6), all required fields must be present — either from this endpoint or via the `customerInfo` field on the customer agreement.

    | Field         | Required    | Path in identity payload                                                |

    | ------------- | ----------- | ----------------------------------------------------------------------- |

    | First Name    | Yes         | `name.givenName`                                                        |

    | Last Name     | Yes         | `name.familyName`                                                       |

    | Phone Number  | Yes         | `phoneNumber`                                                           |

    | Email         | Yes         | `email`                                                                 |

    | Occupation    | Yes         | `occupation`                                                            |

    | Address       | Yes         | `address` (object: `street`, `city`, `region`, `postalCode`, `country`) |

    | Date of Birth | No          | `dateOfBirth`                                                           |

    | CURP          | Mexico only | `idNumbers` entry with `type: "CURP"`                                   |

    | RFC           | Mexico only | `idNumbers` entry with `type: "RFC"`                                    |

    If any required field is missing at agreement signing, the request returns a `400` indicating which field was not provided.

  </Expandable>

  <Info>

    `idNumbers` is optional — defaults to empty. Only needed for Mexican customers (CURP and RFC). Non-Mexican customers can omit it entirely.

  </Info>

</Expandable>
```





```
<Expandable title="Details">

  Upload government ID and selfie images as base64-encoded data URLs. See [POST /ramp/customer/\{id}/kyc/documents](/api-reference/kyc/upload-kyc-documents) for the full schema.

  **Upload ID Document (front and back):**

  ```json theme={null}

  {

    "pubkey": "<wallet_public_key>",

    "documentType": "document",

    "images": [

      { "label": "id_front", "image": "data:image/jpeg;base64,/9j/4AAQ..." },

      { "label": "id_back", "image": "data:image/jpeg;base64,/9j/4AAQ..." }

    ]

  }

  ```

  **Upload Selfie:**

  ```json theme={null}

  {

    "pubkey": "<wallet_public_key>",

    "documentType": "selfie",

    "images": [

      { "label": "selfie", "image": "data:image/jpeg;base64,/9j/4AAQ..." }

    ]

  }

  ```

  **Requirements:** JPEG or PNG, max 10MB per image. Labels: `id_front`, `id_back` (if applicable), `selfie`.

  <Info>

    In **sandbox**, you can submit any placeholder image — the content isn't validated.

  </Info>

</Expandable>
```





```
<Expandable title="Details">

  Register the customer's Mexican bank account (CLABE) using your API key. The `account` field accepts two variants — the system auto-detects Personal vs Business based on the fields present. See [POST /ramp/customer/\{id}/bank-account](/api-reference/bank-accounts/create-bank-account-api-key) for the full schema.

  **Personal Account:**

  ```json theme={null}

  {

    "account": {

      "transactionId": "<uuid>",

      "firstName": "Juan",

      "paternalLastName": "Garcia",

      "maternalLastName": "Lopez",

      "birthDate": "19900515",

      "birthCountryIsoCode": "MX",

      "curp": "GAJU900515HDFRNN09",

      "rfc": "GAJU9005156V3",

      "clabe": "012345678901234567"

    }

  }

  ```

  **Business Account:**

  ```json theme={null}

  {

    "account": {

      "transactionId": "<uuid>",

      "name": "Garcia Enterprises S.A. de C.V.",

      "countryIsoCode": "MX",

      "incorporatedDate": "20150101",

      "rfc": "GEN150101ABC",

      "clabe": "098765432109876543"

    }

  }

  ```

  <Expandable title="Bank account field reference">

    | Field                 | Personal | Business | Format                                 |

    | --------------------- | -------- | -------- | -------------------------------------- |

    | `transactionId`       | Required | Required | UUID (you generate)                    |

    | `firstName`           | Required | —        |                                        |

    | `paternalLastName`    | Required | —        |                                        |

    | `maternalLastName`    | Required | —        |                                        |

    | `birthDate`           | Required | —        | `YYYYMMDD`                             |

    | `birthCountryIsoCode` | Required | —        | ISO 3166-1 alpha-2 (e.g. `MX`)         |

    | `name`                | —        | Required | Legal entity name                      |

    | `incorporatedDate`    | —        | Required | `YYYYMMDD`                             |

    | `countryIsoCode`      | —        | Required | ISO 3166-1 alpha-2 (e.g. `MX`)         |

    | `curp`                | Required | —        | 18 characters                          |

    | `rfc`                 | Required | Required | Personal: 13 chars, Business: 12 chars |

    | `clabe`               | Required | Required | Exactly 18 digits                      |

    Valid country codes: [GET /lookup/country-codes](/api-reference/lookup/get-country-codes)

  </Expandable>

  <Tip>

    **Alternative: Presigned URL auth** — You can also register bank accounts via `POST /ramp/bank-account` using the presigned URL instead of your API key. This is the path used by the Etherfuse hosted onboarding UI. See [POST /ramp/bank-account](/api-reference/bank-accounts/create-bank-account-presigned-url) for details.

  </Tip>

</Expandable>
```





```
<Expandable title="Details">

  Generate a presigned URL to use as the authentication token for agreement signing. The `customerId` must match the organization ID from Step 1. See [POST /ramp/onboarding-url](/api-reference/onboarding/generate-onboarding-url) for the full schema.

  <CodeGroup>

    ```bash Sandbox theme={null}

    curl -X POST [https://api.sand.etherfuse.com/ramp/onboarding-url](https://api.sand.etherfuse.com/ramp/onboarding-url) \

      -H "Authorization: <api_key>" \

      -H "Content-Type: application/json" \

      -d '{

        "customerId": "<customer_uuid>",       # From Step 1

        "bankAccountId": "<bank_account_uuid>", # You generate this UUID

        "publicKey": "<wallet_public_key>",

        "blockchain": "solana"

      }'

    ```

    ```bash Production theme={null}

    curl -X POST [https://api.etherfuse.com/ramp/onboarding-url](https://api.etherfuse.com/ramp/onboarding-url) \

      -H "Authorization: <api_key>" \

      -H "Content-Type: application/json" \

      -d '{

        "customerId": "<customer_uuid>",       # From Step 1

        "bankAccountId": "<bank_account_uuid>", # You generate this UUID

        "publicKey": "<wallet_public_key>",

        "blockchain": "solana"

      }'

    ```

  </CodeGroup>

  **Response:**

  ```json theme={null}

  {

    "presigned_url": "[https://devnet.etherfuse.com/onboarding?token=eyJhbGciOiJIUzI1NiIs](https://devnet.etherfuse.com/onboarding?token=eyJhbGciOiJIUzI1NiIs)..."

  }

  ```

  <Warning>

    **Save the presigned URL** — you'll need it for the next step. Valid for 15 minutes.

  </Warning>

  <Info>

    **KYB-approved orgs can skip this step.** If the child organization from Step 1 has been KYB-approved by Etherfuse, no presigned URL or agreement signing is required.

  </Info>

</Expandable>
```





```
<Expandable title="Details">

  <Info>

    **KYB-approved orgs can skip this step.** If the child organization from Step 1 has been KYB-approved by Etherfuse, agreements are handled as part of the KYB process.

  </Info>

  The customer must accept three agreements **in order**. Each uses the presigned URL as authentication. See the Agreements API reference for full schemas: [electronic signature](/api-reference/agreements/accept-electronic-signature-consent), [terms and conditions](/api-reference/agreements/accept-terms-and-conditions), [customer agreement](/api-reference/agreements/accept-customer-agreement).

  <Warning>

    **User Authorization Required** — These create legally binding obligations. The presigned URL authenticates the user and serves as their electronic signature authorization. Ensure the actual end user initiates or explicitly authorizes these requests.

  </Warning>

  **1. Electronic Signature Consent:**

  ```json theme={null}

  POST /ramp/agreements/electronic-signature

  { "presignedUrl": "<presigned_url_from_step_5>" }

  ```

  **2. Terms and Conditions:**

  ```json theme={null}

  POST /ramp/agreements/terms-and-conditions

  { "presignedUrl": "<presigned_url_from_step_5>" }

  ```

  **3. Customer Agreement:**

  ```json theme={null}

  POST /ramp/agreements/customer-agreement

  { "presignedUrl": "<presigned_url_from_step_5>" }

  ```

  If any required identity fields are missing from Step 2, you can provide them here via `customerInfo`:

  ```json theme={null}

  {

    "presignedUrl": "<presigned_url_from_step_5>",

    "customerInfo": {

      "phone": "+521234567890",

      "email": "[juan@example.com](mailto:juan@example.com)",

      "occupation": "Software Engineer",

      "additionalInfo": {

        "curp": "GAJU900515HDFRNN09",

        "rfc": "GAJU9005156V3"

      }

    }

  }

  ```

  The `customerInfo` fields merge with whatever identity data is already on file. Only include what's missing.

  <Info>

    In **sandbox**, the customer is auto-approved when the customer agreement is signed.

  </Info>

</Expandable>
```





```
<Expandable title="Details">

  Track onboarding progress via `kyc_updated` webhooks or by polling [GET /ramp/customer/\{id}/kyc/\{pubkey}](/api-reference/kyc/get-kyc-status):

  ```bash theme={null}

  GET /ramp/customer/{customer_uuid}/kyc/{pubkey}

  ```

  See [Checking KYC Status](/guides/onboarding#checking-kyc-status) for response details and status values.

</Expandable>
```







  A bank account must be `compliant: true` before you can create orders. Two paths to compliance:

1. **Customer self-verifies** — After submitting data via API, redirect the customer to the presigned URL. They complete identity verification (facial scan + ID matching) in the Etherfuse UI, which marks the bank account compliant immediately.
2. **Etherfuse admin reviews** — Submit everything programmatically and wait for admins to review the uploaded documents. The customer's selfie and government ID (Step 3) must be uploaded before the admin can complete the compliance check.

  In **sandbox**, all bank accounts under an approved customer are considered compliant.





  Partners can only access KYC data they submitted:

  | Accessor              | Data Visibility                                            |

  | --------------------- | ---------------------------------------------------------- |

  | Partner (via API key) | Only data where `source_organization_id` matches their org |

  | Wallet Owner          | All data for their wallet                                  |

  | Admin                 | All data                                                   |

  This prevents partners from accessing PII submitted by other partners or directly by users.





  When you submit KYC programmatically, Etherfuse suppresses standard KYC notification emails to the user. Your application is responsible for communicating status updates via webhook events.

