// Discord Bot Optimizations
// Critical performance improvements

const { LRUCache } = require('lru-cache');

// Supabase client reference (will be set by bot.js)
let supabase;
function setSupabaseClient(supabaseClient) {
  supabase = supabaseClient;
}

// XP configuration constants
const MESSAGE_XP = 1;
const DAILY_ACTIVITY_XP = 5;
const WEEKLY_STREAK_XP = 10;

// Level calculation function (copied from bot.js)
function getCurrentLevel(totalXP) {
  if (totalXP < 250) return { name: 'Bronze', minXP: 0, maxXP: 249 };
  if (totalXP < 500) return { name: 'Silver', minXP: 250, maxXP: 499 };
  if (totalXP < 1000) return { name: 'Gold', minXP: 500, maxXP: 999 };
  if (totalXP < 2000) return { name: 'Platinum', minXP: 1000, maxXP: 1999 };
  return { name: 'Diamond', minXP: 2000, maxXP: Infinity };
}

// 1. OPTIMIZED CACHE SYSTEM
const userCache = new LRUCache({
  max: 500, // Max 500 users
  maxAge: 1000 * 60 * 10, // 10 minutes
  updateAgeOnGet: true,
  dispose: (key, value) => {
    console.log(`🗑️ Cache entry expired: ${key}`);
  }
});

const processedMessages = new LRUCache({
  max: 3000, // Max 3000 messages
  maxAge: 1000 * 60 * 5, // 5 minutes
  updateAgeOnGet: true
});

const processedReactions = new LRUCache({
  max: 2000, // Max 2000 reactions
  maxAge: 1000 * 60 * 5, // 5 minutes
  updateAgeOnGet: true
});

// 2. PERFORMANCE METRICS
const metrics = {
  messagesProcessed: 0,
  dbQueries: 0,
  cacheHits: 0,
  cacheMisses: 0,
  avgResponseTime: 0,
  errors: 0,
  batchUpdates: 0,
  memoryUsage: 0,
  xpUpdates: 0
};

// 3. CIRCUIT BREAKER FOR DATABASE
class CircuitBreaker {
  constructor(failureThreshold = 5, timeout = 60000) {
    this.failureThreshold = failureThreshold;
    this.timeout = timeout;
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED';
  }
  
  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.warn('⚠️ Circuit breaker opened due to failures');
    }
  }
}

const dbCircuitBreaker = new CircuitBreaker();

// 4. BATCH XP PROCESSING
class XPBatchProcessor {
  constructor(batchSize = 30, batchInterval = 30000) {
    this.batchSize = batchSize;
    this.batchInterval = batchInterval;
    this.queue = new Map(); // discordId -> { xpAmount, reason }
    this.processing = false;
    this.interval = null;
  }
  
  add(discordId, xpAmount, reason = 'activity') {
    const existing = this.queue.get(discordId);
    if (existing) {
      existing.xpAmount += xpAmount;
    } else {
      this.queue.set(discordId, { xpAmount, reason });
    }
    
    if (this.queue.size >= this.batchSize) {
      this.processBatch();
    }
  }
  
  async processBatch() {
    if (this.processing || this.queue.size === 0) return;
    
    console.log(`🔄 Starting batch processing with ${this.queue.size} updates...`);
    this.processing = true;
    const updates = Array.from(this.queue.entries());
    this.queue.clear();
    
    try {
      console.log(`📋 Processing ${updates.length} updates:`, updates.map(([id, data]) => `${id}: +${data.xpAmount} XP`));
      await this.executeBatch(updates);
      metrics.batchUpdates++;
      console.log(`✅ Batch processing completed successfully`);
    } catch (error) {
      console.error('❌ Batch XP processing error:', error);
      console.error('❌ Error stack:', error.stack);
      metrics.errors++;
    } finally {
      this.processing = false;
    }
  }
  
  async executeBatch(updates) {
    const batchUpdates = [];
    
    for (const [discordId, { xpAmount, reason }] of updates) {
      try {
        // Check if user is connected (cached check first)
        const cached = userCache.get(discordId);
        if (cached && !cached.isConnected) {
          console.log(`⚠️ User ${discordId} not connected (cached), skipping XP update`);
          continue;
        }
        
        // If not in cache or not marked as connected, check database
        if (!cached || !cached.isConnected) {
          const { data: userData, error: userError } = await dbCircuitBreaker.execute(async () => {
            return await supabase
              .from('discord_users')
              .select('discord_id, is_active')
              .eq('discord_id', discordId)
              .single();
          });
          
          if (userError || !userData || !userData.is_active) {
            console.log(`⚠️ User ${discordId} not connected (database check), skipping XP update`);
            // Cache the result to avoid repeated database calls
            userCache.set(discordId, {
              isConnected: false,
              lastUpdate: Date.now()
            });
            continue;
          }
          
          // User is connected, update cache
          userCache.set(discordId, {
            isConnected: true,
            lastUpdate: Date.now()
          });
        }
        
        // Get current activity
        let activity = cached?.xpData;
        if (!activity) {
          const { data, error } = await dbCircuitBreaker.execute(async () => {
            return await supabase
              .from('discord_activities')
              .select('total_xp, current_level')
              .eq('discord_id', discordId)
              .single();
          });
          
          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching Discord activity:', error);
            continue;
          }
          
          activity = data || { total_xp: 0, current_level: 1 };
        }
        
        const currentXP = activity.total_xp || 0;
        const newXP = currentXP + xpAmount;
        const newLevel = getCurrentLevel(newXP);
        
        batchUpdates.push({
          discord_id: discordId,
          total_xp: newXP,
          current_level: newLevel.name === 'Bronze' ? 1 : 
                       newLevel.name === 'Silver' ? 2 : 
                       newLevel.name === 'Gold' ? 3 : 
                       newLevel.name === 'Platinum' ? 4 : 5,
          updated_at: new Date().toISOString()
        });
        
        // Update cache
        if (cached) {
          cached.xpData = { 
            total_xp: newXP, 
            current_level: newLevel.name === 'Bronze' ? 1 : 
                         newLevel.name === 'Silver' ? 2 : 
                         newLevel.name === 'Gold' ? 3 : 
                         newLevel.name === 'Platinum' ? 4 : 5
          };
        }
        
      } catch (error) {
        console.error(`❌ Error processing XP update for ${discordId}:`, error);
      }
    }
    
    if (batchUpdates.length > 0) {
      try {
        console.log(`🔄 Processing ${batchUpdates.length} XP updates...`);
        console.log(`📊 Batch updates:`, batchUpdates.map(u => `${u.discord_id}: +${u.total_xp} XP`));
        
        await dbCircuitBreaker.execute(async () => {
          console.log(`💾 Executing database upsert for ${batchUpdates.length} updates...`);
          
          // Try direct SQL to avoid trigger issues
          const { error } = await supabase
            .rpc('update_discord_activities_batch', {
              updates: batchUpdates
            });
          
          if (error) {
            console.log(`⚠️ RPC failed, trying direct upsert...`);
            // Fallback to direct upsert
            const { error: upsertError } = await supabase
              .from('discord_activities')
              .upsert(batchUpdates, {
                onConflict: 'discord_id'
              });
            
            if (upsertError) {
              console.error(`❌ Database upsert error:`, upsertError);
              throw upsertError;
            }
          }
          
          console.log(`✅ Successfully processed ${batchUpdates.length} XP updates`);
          return { processed: batchUpdates.length };
        });
      } catch (error) {
        console.error('❌ Batch XP processing error:', error);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        // Continue processing other updates even if one fails
      }
    }
  }
  
  start() {
    this.interval = setInterval(() => {
      this.processBatch();
    }, this.batchInterval);
  }
  
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

const xpBatchProcessor = new XPBatchProcessor();

// 5. MEMORY MONITORING
function startMemoryMonitoring() {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    metrics.memoryUsage = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    console.log('💾 Memory Usage:', {
      rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
      heapUsed: metrics.memoryUsage + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
      cacheSize: userCache.size
    });
    
    if (memUsage.heapUsed > 400 * 1024 * 1024) { // 400MB
      console.warn('⚠️ High memory usage detected');
      userCache.clear();
      processedMessages.clear();
      processedReactions.clear();
      global.gc && global.gc(); // Force garbage collection
    }
  }, 60000); // Every minute
}

// 6. OPTIMIZED DATABASE QUERY WRAPPER
async function executeQueryOptimized(queryFn, operation = 'unknown') {
  const startTime = Date.now();
  metrics.dbQueries++;
  
  try {
    const result = await dbCircuitBreaker.execute(queryFn);
    const duration = Date.now() - startTime;
    metrics.avgResponseTime = (metrics.avgResponseTime + duration) / 2;
    
    // Log slow queries (>100ms)
    if (duration > 100) {
      console.log(`🐌 Slow query (${duration}ms): ${operation}`);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Query failed (${duration}ms): ${operation}`, error);
    metrics.errors++;
    throw error;
  }
}

// 7. CACHE UTILITIES
function getCachedUserOptimized(discordId) {
  const cached = userCache.get(discordId);
  if (cached) {
    metrics.cacheHits++;
    return cached;
  }
  metrics.cacheMisses++;
  return null;
}

function setCachedUserOptimized(discordId, userData, xpData = null) {
  const cached = userCache.get(discordId) || {};
  userCache.set(discordId, {
    ...cached,
    ...userData,
    isConnected: true, // Mark as connected when setting user data
    xpData: xpData || cached.xpData,
    lastUpdate: Date.now()
  });
}

// 8. RATE LIMITING OPTIMIZATION
class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }
  
  isAllowed(userId) {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    
    // Remove old requests
    const validRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(userId, validRequests);
    return true;
  }
  
  cleanup() {
    const now = Date.now();
    for (const [userId, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(userId);
      } else {
        this.requests.set(userId, validRequests);
      }
    }
  }
}

const rateLimiter = new RateLimiter();

// 9. HEALTH CHECK ENDPOINT
const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
    },
    metrics: metrics,
    cache: {
      userCacheSize: userCache.size,
      processedMessagesSize: processedMessages.size,
      processedReactionsSize: processedReactions.size
    },
    circuitBreaker: {
      state: dbCircuitBreaker.state,
      failures: dbCircuitBreaker.failures
    },
    xpBatchProcessor: {
      queueSize: xpBatchProcessor.queue.size,
      processing: xpBatchProcessor.processing
    }
  });
});

// 10. OPTIMIZED XP ADDING
async function addXPOptimized(discordId, xpAmount, reason = 'activity') {
  const startTime = Date.now();
  
  try {
    console.log(`🎯 Adding XP for user ${discordId}: +${xpAmount} XP (${reason})`);
    
    // Check rate limiting
    if (!rateLimiter.isAllowed(discordId)) {
      console.log(`⚠️ Rate limited user: ${discordId}`);
      return false;
    }
    
    // Add to batch processor
    console.log(`📦 Adding to batch processor: ${discordId} -> +${xpAmount} XP`);
    xpBatchProcessor.add(discordId, xpAmount, reason);
    
    // Update metrics
    const duration = Date.now() - startTime;
    metrics.xpUpdates++;
    metrics.avgResponseTime = (metrics.avgResponseTime + duration) / 2;
    
    console.log(`✅ XP added successfully for ${discordId} in ${duration}ms`);
    return true;
  } catch (error) {
    console.error('❌ Error in optimized XP adding:', error);
    metrics.errors++;
    return false;
  }
}

// 11. OPTIMIZED MESSAGE PROCESSING
async function processMessageOptimized(message) {
  const startTime = Date.now();
  
  try {
    // Skip bot messages
    if (message.author.bot) return;
    
    const messageKey = `${message.id}-${message.author.id}`;
    
    // Check if message already processed
    if (processedMessages.has(messageKey)) {
      metrics.cacheHits++;
      return;
    }
    
    // Add to processed messages
    processedMessages.set(messageKey, true);
    
    // Add XP for message
    await addXPOptimized(message.author.id, MESSAGE_XP, 'message');
    
    // Update metrics
    const duration = Date.now() - startTime;
    metrics.messagesProcessed++;
    metrics.avgResponseTime = (metrics.avgResponseTime + duration) / 2;
    
  } catch (error) {
    console.error('❌ Error in optimized message processing:', error);
    metrics.errors++;
  }
}

// 12. CLEANUP FUNCTIONS
function cleanup() {
  console.log('🧹 Starting cleanup...');
  
  // Clear caches
  userCache.clear();
  processedMessages.clear();
  processedReactions.clear();
  
  // Stop batch processor
  xpBatchProcessor.stop();
  
  // Cleanup rate limiter
  rateLimiter.cleanup();
  
  console.log('✅ Cleanup completed');
}

// 13. INITIALIZATION
function initializeOptimizations() {
  console.log('🚀 Initializing Discord bot optimizations...');
  
  // Start batch processor
  xpBatchProcessor.start();
  
  // Start memory monitoring
  startMemoryMonitoring();
  
  // Start health check server
  app.listen(3002, () => {
    console.log('🏥 Discord bot health check server running on port 3002');
  });
  
  // Cleanup on process exit
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
  console.log('✅ Discord bot optimizations initialized');
}

module.exports = {
  userCache,
  processedMessages,
  processedReactions,
  metrics,
  dbCircuitBreaker,
  xpBatchProcessor,
  rateLimiter,
  executeQueryOptimized,
  getCachedUserOptimized,
  setCachedUserOptimized,
  addXPOptimized,
  processMessageOptimized,
  cleanup,
  initializeOptimizations,
  setSupabaseClient
}; 