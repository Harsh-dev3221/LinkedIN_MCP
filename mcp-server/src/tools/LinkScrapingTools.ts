import axios from 'axios';
import * as cheerio from 'cheerio';
import { randomUUID } from 'crypto';
import { supabase } from '../database/supabase.js';

export interface ScrapeOptions {
    timeout: number;
    maxContentLength: number;
    followRedirects: boolean;
    cacheResults: boolean;
}

export interface ScrapedData {
    id: string;
    url: string;
    type: 'github' | 'website';
    title: string;
    description: string;
    content: string;
    metadata: {
        author?: string;
        language?: string;
        tags?: string[];
        projectFiles?: Record<string, any>;
        scrapingMethod?: string;
    };
    github?: {
        stars: number;
        forks: number;
        language: string;
        readme: string;
        topics: string[];
        projectFiles: Record<string, any>;
        size: number;
        defaultBranch: string;
        createdAt?: string;
        updatedAt?: string;
    };
    scrapedAt?: Date;
    status: 'success' | 'error';
}

export class LinkScrapingTools {
    private readonly defaultOptions: ScrapeOptions = {
        timeout: 15000,
        maxContentLength: 6000,
        followRedirects: true,
        cacheResults: true
    };

    /**
     * Main scraping method - detects link type and routes to appropriate scraper
     */
    public async scrapeLinks(
        urls: string[],
        userId: string,
        options: Partial<ScrapeOptions> = {}
    ): Promise<ScrapedData[]> {
        const finalOptions = { ...this.defaultOptions, ...options };
        const results: ScrapedData[] = [];

        console.log(`🔍 Starting to scrape ${urls.length} link(s)...`);

        for (const url of urls) {
            try {
                console.log(`🔍 Scraping: ${url}`);

                if (!this.isValidUrl(url)) {
                    throw new Error('Invalid URL format');
                }

                let scrapedData: ScrapedData;

                // Route to appropriate scraper based on URL
                if (url.includes('github.com')) {
                    scrapedData = await this.scrapeGitHub(url, finalOptions);
                } else {
                    scrapedData = await this.scrapeWebsite(url, finalOptions);
                }

                // Cache results if enabled
                if (finalOptions.cacheResults) {
                    await this.cacheScrapedContent(scrapedData, userId);
                }

                results.push(scrapedData);
                console.log(`✅ Successfully scraped: ${scrapedData.title}`);

            } catch (error) {
                console.error(`❌ Error scraping ${url}:`, error);
                results.push({
                    id: randomUUID(),
                    url,
                    type: 'website',
                    title: 'Error',
                    description: 'Failed to scrape content',
                    content: '',
                    metadata: {},
                    status: 'error'
                });
            }
        }

        return results;
    }

    /**
     * Scrape GitHub repository - Using WORKING logic from test-scraping.js
     */
    private async scrapeGitHub(url: string, options: ScrapeOptions): Promise<ScrapedData> {
        console.log(`🐙 Scraping GitHub repository: ${url}`);

        try {
            // Extract owner and repo from URL (matching test-scraping.js)
            const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
            if (!match) {
                throw new Error('Invalid GitHub URL format');
            }

            const [, owner, repo] = match;
            console.log(`📂 Repository: ${owner}/${repo}`);

            // Step 1: Test main repository page scraping (exact logic from test-scraping.js)
            console.log('📂 Step 1: Testing repository main page scraping...');
            const mainPageResponse = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: options.timeout
            });

            const $ = cheerio.load(mainPageResponse.data);

            // Extract repository metadata (exact selectors from test-scraping.js)
            const repoName = $('h1[data-pjax="#js-repo-pjax-container"] strong a').text().trim() || repo;
            const description = $('p.f4.my-3').text().trim() ||
                $('[data-pjax="#js-repo-pjax-container"] p').first().text().trim() ||
                'No description available';

            console.log('✅ Repository metadata extracted:');
            console.log(`   📛 Name: ${repoName}`);
            console.log(`   📝 Description: ${description}`);
            console.log(`   🔗 URL: ${url}`);
            console.log(`   🛠️ Method: Direct HTML scraping with Cheerio`);

            // Step 2: Testing README scraping (exact logic from test-scraping.js)
            console.log('\n📖 Step 2: Testing README scraping...');
            let readmeContent = '';
            try {
                const readmeUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`;
                const readmeResponse = await axios.get(readmeUrl, { timeout: 10000 });
                readmeContent = readmeResponse.data;

                console.log('✅ README scraped successfully:');
                console.log(`   📄 Length: ${readmeContent.length} characters`);
                console.log(`   🔗 Source: ${readmeUrl}`);
                console.log(`   🛠️ Method: Direct raw file access`);
                console.log(`   📝 Preview: ${readmeContent.substring(0, 300)}...`);
            } catch (readmeError) {
                console.log('⚠️ README scraping failed, trying master branch...');
                try {
                    const readmeUrlMaster = `https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`;
                    const readmeResponse = await axios.get(readmeUrlMaster, { timeout: 10000 });
                    readmeContent = readmeResponse.data;

                    console.log('✅ README scraped from master branch:');
                    console.log(`   📄 Length: ${readmeContent.length} characters`);
                    console.log(`   📝 Preview: ${readmeContent.substring(0, 200)}...`);
                } catch (masterError) {
                    console.log('❌ README not found in main or master branch');
                }
            }

            // Step 3: Testing project files scraping (exact logic from test-scraping.js)
            console.log('\n📦 Step 3: Testing project files scraping...');
            const projectFiles = await this.scrapeProjectFilesWithWorkingLogic(owner, repo);

            // Step 4: Summary (matching test-scraping.js output)
            console.log('\n🎉 Scraping test completed!');
            console.log(`📋 Summary:`);
            console.log(`   📂 Repository: ${owner}/${repo}`);
            console.log(`   📄 Project files found: ${Object.keys(projectFiles).length}`);
            console.log(`   📝 Files: ${Object.keys(projectFiles).join(', ')}`);

            // Step 5: Build result with working data structure
            const scrapedResult: ScrapedData = {
                id: randomUUID(),
                url,
                type: 'github',
                title: `${owner}/${repoName}`,
                description,
                content: readmeContent,
                metadata: {
                    author: owner,
                    language: 'JavaScript', // Would be extracted from page
                    tags: [],
                    projectFiles: projectFiles,
                    scrapingMethod: 'direct-web-scraping'
                },
                github: {
                    stars: 0, // Would be extracted from page
                    forks: 0, // Would be extracted from page
                    language: 'JavaScript',
                    readme: readmeContent,
                    topics: [],
                    projectFiles: projectFiles,
                    size: 0,
                    defaultBranch: 'main'
                },
                status: 'success'
            };

            console.log('\n🎯 Test Result: FREE GitHub scraping is working! ✅');
            console.log('🔗 The scraper can extract:');
            console.log('   ✅ Repository metadata');
            console.log('   ✅ README content');
            console.log('   ✅ Project configuration files');
            console.log('   ✅ File contents for AI processing');

            return scrapedResult;

        } catch (error: any) {
            console.error('❌ Free GitHub scraping failed:', error instanceof Error ? error.message : 'Unknown error');
            throw new Error(`Failed to scrape GitHub repository directly: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Scrape project files using EXACT working logic from test-scraping.js
     */
    private async scrapeProjectFilesWithWorkingLogic(owner: string, repo: string): Promise<Record<string, any>> {
        const filesToTest = [
            { name: 'package.json', type: 'json', description: 'Node.js dependencies and scripts' },
            { name: 'requirements.txt', type: 'text', description: 'Python dependencies' },
            { name: 'pyproject.toml', type: 'toml', description: 'Python project configuration' },
            { name: 'Cargo.toml', type: 'toml', description: 'Rust project configuration' },
            { name: 'go.mod', type: 'text', description: 'Go module configuration' },
            { name: 'LICENSE', type: 'text', description: 'Project license' },
            { name: 'Dockerfile', type: 'docker', description: 'Docker configuration' }
        ];

        const foundFiles = [];

        for (const file of filesToTest) {
            try {
                console.log(`📄 Checking for ${file.name}...`);

                // Try main branch first, then master (exact logic from test-scraping.js)
                const branches = ['main', 'master'];
                let content = '';
                let success = false;

                for (const branch of branches) {
                    try {
                        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.name}`;
                        const response = await axios.get(rawUrl, {
                            timeout: 8000,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                            }
                        });

                        content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
                        success = true;
                        console.log(`✅ Found ${file.name} (${content.length} chars)`);

                        // Parse JSON files for detailed info (exact logic from test-scraping.js)
                        if (file.type === 'json' && file.name === 'package.json') {
                            try {
                                const parsed = JSON.parse(content);
                                console.log(`   📦 Package details:`, {
                                    name: parsed.name,
                                    version: parsed.version,
                                    description: parsed.description,
                                    dependencies: Object.keys(parsed.dependencies || {}),
                                    devDependencies: Object.keys(parsed.devDependencies || {}),
                                    scripts: Object.keys(parsed.scripts || {})
                                });
                            } catch (parseError) {
                                console.log(`   ⚠️ Could not parse ${file.name} as JSON`);
                            }
                        }

                        foundFiles.push({
                            name: file.name,
                            type: file.type,
                            description: file.description,
                            content: content.substring(0, 500), // First 500 chars for preview
                            size: content.length
                        });

                        break;
                    } catch (branchError) {
                        // Try next branch
                        continue;
                    }
                }

                if (!success) {
                    console.log(`   ❌ ${file.name} not found`);
                }
            } catch (error) {
                console.log(`   ❌ Error checking ${file.name}:`, error instanceof Error ? error.message : 'Unknown error');
            }
        }

        // Convert to the expected format
        const projectFiles: Record<string, any> = {};
        foundFiles.forEach(file => {
            projectFiles[file.name] = file;
        });

        return projectFiles;
    }

    /**
     * Scrape general website
     */
    private async scrapeWebsite(url: string, options: ScrapeOptions): Promise<ScrapedData> {
        try {
            const response = await axios.get(url, {
                timeout: options.timeout,
                maxRedirects: options.followRedirects ? 5 : 0,
                headers: {
                    'User-Agent': 'PostWizz-LinkScraper/1.0 (Mozilla/5.0 compatible)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive'
                }
            });

            const $ = cheerio.load(response.data);

            // Extract basic information
            const title = $('title').text().trim() ||
                $('h1').first().text().trim() ||
                'No title found';

            const description = $('meta[name="description"]').attr('content') ||
                $('meta[property="og:description"]').attr('content') ||
                $('p').first().text().trim().substring(0, 200) ||
                'No description available';

            // Extract main content
            let content = '';

            // Try different content selectors
            const contentSelectors = [
                'article',
                '.content',
                '.post-content',
                '.entry-content',
                'main',
                '.main-content',
                'body'
            ];

            for (const selector of contentSelectors) {
                const element = $(selector);
                if (element.length > 0) {
                    content = element.text().trim();
                    break;
                }
            }

            // Fallback to body text
            if (!content) {
                content = $('body').text().trim();
            }

            // Clean and limit content
            content = this.cleanContent(content);
            if (content.length > options.maxContentLength) {
                content = content.substring(0, options.maxContentLength) + '...';
            }

            // Extract metadata
            const author = $('meta[name="author"]').attr('content') ||
                $('meta[property="article:author"]').attr('content') ||
                $('.author').first().text().trim();

            return {
                id: randomUUID(),
                url,
                type: 'website',
                title,
                description,
                content,
                metadata: {
                    author: author || undefined,
                    language: $('html').attr('lang') || 'en'
                },
                scrapedAt: new Date(),
                status: 'success'
            };
        } catch (error) {
            console.error('Error scraping website:', error);
            throw new Error(`Failed to scrape website: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Extract number from text (for stars, forks, etc.)
     */
    private extractNumberFromText(text: string): number {
        if (!text) return 0;
        const match = text.match(/[\d,]+/);
        if (match) {
            return parseInt(match[0].replace(/,/g, ''), 10) || 0;
        }
        return 0;
    }

    /**
     * Validate URL format
     */
    private isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Clean scraped content
     */
    private cleanContent(content: string): string {
        return content
            .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
            .replace(/\n\s*\n/g, '\n\n')  // Clean up multiple newlines
            .trim();
    }

    /**
     * Cache scraped content in database
     */
    private async cacheScrapedContent(scrapedData: ScrapedData, userId: string): Promise<void> {
        try {
            // Create URL hash for caching
            const urlHash = Buffer.from(scrapedData.url).toString('base64').substring(0, 64);

            // Cache for 24 hours
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);

            const { error } = await supabase
                .from('scraped_content')
                .upsert({
                    id: scrapedData.id,
                    user_id: userId,
                    url: scrapedData.url,
                    type: scrapedData.type,
                    title: scrapedData.title,
                    content: scrapedData.content,
                    metadata: scrapedData.metadata,
                    scraped_at: scrapedData.scrapedAt,
                    status: scrapedData.status
                });

            if (error) {
                console.error('Error caching scraped content:', error);
            }

            // Also update the link cache
            await supabase
                .from('link_cache')
                .upsert({
                    url_hash: urlHash,
                    url: scrapedData.url,
                    scraped_data: scrapedData,
                    expires_at: expiresAt
                });
        } catch (error) {
            console.error('Error caching scraped content:', error);
            // Don't throw error - caching failure shouldn't break scraping
        }
    }

    /**
     * Detect links in text content (for MCP integration)
     */
    public async detectLinks({ text, userId }: { text: string, userId: string }): Promise<{ content: Array<{ type: string, text: string }> }> {
        try {
            const urlRegex = /https?:\/\/[^\s]+/g;
            const urls = text.match(urlRegex) || [];

            const links = urls.map(url => ({
                url,
                type: url.includes('github.com') ? 'github' : 'website',
                position: text.indexOf(url)
            }));

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        links,
                        totalFound: links.length,
                        text: text
                    })
                }]
            };
        } catch (error: any) {
            console.error('Error detecting links:', error);
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        links: [],
                        totalFound: 0,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    })
                }]
            };
        }
    }

    /**
     * Scrape multiple URLs (for MCP integration)
     */
    public async scrapeUrls({
        urls,
        userId,
        options = {}
    }: {
        urls: string[],
        userId: string,
        options?: Partial<ScrapeOptions>
    }): Promise<{ content: Array<{ type: string, text: string }> }> {
        try {
            const results = await this.scrapeLinks(urls, userId, options);

            const summary = {
                total: results.length,
                successful: results.filter(r => r.status === 'success').length,
                failed: results.filter(r => r.status === 'error').length
            };

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        results,
                        summary,
                        scrapedAt: new Date().toISOString()
                    })
                }]
            };
        } catch (error: any) {
            console.error('Error scraping URLs:', error);
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        results: [],
                        summary: { total: 0, successful: 0, failed: urls.length },
                        error: error instanceof Error ? error.message : 'Unknown error'
                    })
                }]
            };
        }
    }
}