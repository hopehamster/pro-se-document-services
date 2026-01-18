const https = require('https');

const HOSTINGER_API_TOKEN = process.env.HOSTINGER_API_TOKEN || "TLiibrXifMjFyyW5TQULw992ZfkmkXj8uAbjCl0c7f62f769";
const DOMAIN = "prosedocuserv.com";
const GITHUB_PAGES_IPS = [
    "185.199.108.153",
    "185.199.109.153",
    "185.199.110.153",
    "185.199.111.153"
];

// GitHub Pages domain for CNAME/ALIAS (if needed)
const GITHUB_PAGES_DOMAIN = "hopehamster.github.io";

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.hostinger.com',
            path: path,
            method: method,
            headers: {
                'Authorization': `Bearer ${HOSTINGER_API_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = body ? JSON.parse(body) : {};
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        reject(new Error(`API Error ${res.statusCode}: ${JSON.stringify(parsed)}`));
                    }
                } catch (e) {
                    reject(new Error(`Parse Error: ${body}`));
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function getDomainList() {
    console.log('Fetching domain list...');
    try {
        const response = await makeRequest('GET', '/v1/domains');
        console.log('Domains:', JSON.stringify(response, null, 2));
        return response;
    } catch (error) {
        console.error('Error fetching domains:', error.message);
        throw error;
    }
}

async function getDNSRecords(domain) {
    console.log(`Fetching DNS records for ${domain}...`);
    try {
        // Try different possible endpoints
        const endpoints = [
            `/v1/domains/${domain}/dns`,
            `/v1/domains/${domain}/dns/records`,
            `/v1/dns/${domain}`,
            `/v1/dns/${domain}/records`
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await makeRequest('GET', endpoint);
                console.log(`DNS records (${endpoint}):`, JSON.stringify(response, null, 2));
                return response;
            } catch (e) {
                console.log(`Tried ${endpoint}, got: ${e.message}`);
            }
        }
        throw new Error('Could not find DNS endpoint');
    } catch (error) {
        console.error('Error fetching DNS records:', error.message);
        throw error;
    }
}

async function updateDNSRecords(domain, records) {
    console.log(`Updating DNS records for ${domain}...`);
    try {
        // Try different possible endpoints
        const endpoints = [
            `/v1/domains/${domain}/dns`,
            `/v1/domains/${domain}/dns/records`,
            `/v1/dns/${domain}`,
            `/v1/dns/${domain}/records`
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await makeRequest('PUT', endpoint, records);
                console.log(`DNS updated (${endpoint}):`, JSON.stringify(response, null, 2));
                return response;
            } catch (e) {
                console.log(`Tried ${endpoint}, got: ${e.message}`);
            }
        }
        throw new Error('Could not find DNS update endpoint');
    } catch (error) {
        console.error('Error updating DNS records:', error.message);
        throw error;
    }
}

async function main() {
    try {
        // Step 1: Get domain list to verify domain exists
        const domains = await getDomainList();
        
        // Step 2: Get current DNS records
        const currentDNS = await getDNSRecords(DOMAIN);
        
        // Step 3: Prepare new DNS records for GitHub Pages
        // For apex domain, we need A records pointing to GitHub Pages IPs
        const newRecords = {
            records: GITHUB_PAGES_IPS.map(ip => ({
                type: 'A',
                name: '@',
                value: ip,
                ttl: 3600
            }))
        };
        
        console.log('\nPrepared DNS records for GitHub Pages:');
        console.log(JSON.stringify(newRecords, null, 2));
        
        // Step 4: Update DNS records
        // Note: We might need to merge with existing records, so let's check the current structure first
        console.log('\nCurrent DNS structure:');
        console.log(JSON.stringify(currentDNS, null, 2));
        
        // Uncomment to actually update:
        // await updateDNSRecords(DOMAIN, newRecords);
        console.log('\n⚠️  DNS update is commented out. Review the output above and uncomment to proceed.');
        
    } catch (error) {
        console.error('Script failed:', error);
        process.exit(1);
    }
}

main();
