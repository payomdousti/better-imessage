/**
 * Insights computation service
 * Analytics engine for message data
 */

const { dbAll, dbGet } = require('../db/connection');
const { getDisplayName, getContactId } = require('../db/contacts');
const { convertMacTime } = require('../helpers/time');
const logger = require('../helpers/logger');

/**
 * Compute comprehensive insights from message data
 */
async function computeInsights() {
  // Run independent queries in parallel for better performance
  const [overview, rawContacts, hourlyActivity, dailyActivity, groupChats, timeline, mediaStats] = 
    await Promise.all([
      computeOverview(),
      computeRawContacts(),
      computeHourlyActivity(),
      computeDailyActivity(),
      computeGroupChats(),
      computeTimeline(),
      computeMediaStats()
    ]);

  // Process top contacts with deduplication
  const topContacts = deduplicateContacts(rawContacts);

  // Build network graph from group chats
  const networkGraph = buildNetworkGraph(groupChats, topContacts);

  // Activity patterns
  const activityPatterns = {
    byHour: hourlyActivity.map(r => ({ 
      hour: r.hour, 
      count: r.count, 
      sent: r.sent, 
      received: r.received 
    })),
    byDayOfWeek: dailyActivity.map(r => ({ 
      day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][r.day], 
      dayNum: r.day, 
      count: r.count 
    }))
  };

  // Compute response metrics and streaks (these depend on contacts, so run after)
  const [responseMetrics, streaks] = await Promise.all([
    computeResponseMetrics(),
    computeStreaks()
  ]);

  return {
    overview,
    topContacts,
    activityPatterns,
    networkGraph,
    responseMetrics,
    contentAnalysis: { media: mediaStats },
    streaks,
    timeline
  };
}

/**
 * Compute overview statistics
 */
async function computeOverview() {
  const row = await dbGet(`
    SELECT 
      COUNT(*) as total_messages,
      SUM(CASE WHEN is_from_me = 1 THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN is_from_me = 0 THEN 1 ELSE 0 END) as received,
      COUNT(DISTINCT date(datetime(date/1000000000 + 978307200, 'unixepoch'))) as active_days
    FROM message
    WHERE date > 0
  `);
  
  return {
    totalMessages: row?.total_messages || 0,
    sent: row?.sent || 0,
    received: row?.received || 0,
    activeDays: row?.active_days || 0
  };
}

/**
 * Compute raw contact statistics (before deduplication)
 */
async function computeRawContacts() {
  return dbAll(`
    SELECT 
      h.id as identifier,
      COUNT(*) as message_count,
      SUM(CASE WHEN m.is_from_me = 1 THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN m.is_from_me = 0 THEN 1 ELSE 0 END) as received,
      MAX(m.date) as last_message,
      MIN(m.date) as first_message,
      AVG(LENGTH(COALESCE(m.text, ''))) as avg_length
    FROM message m
    JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
    JOIN chat_handle_join chj ON cmj.chat_id = chj.chat_id
    JOIN handle h ON chj.handle_id = h.ROWID
    WHERE m.date > 0
    GROUP BY h.id
    ORDER BY message_count DESC
    LIMIT 200
  `);
}

/**
 * Deduplicate contacts by contact_id or display name
 */
function deduplicateContacts(rawContacts) {
  const contactMap = new Map();
  
  for (const r of rawContacts) {
    const contactId = getContactId(r.identifier);
    const name = getDisplayName(r.identifier);
    const key = contactId || name;
    
    if (!contactMap.has(key)) {
      contactMap.set(key, {
        identifier: r.identifier,
        name,
        messageCount: 0,
        sent: 0,
        received: 0,
        firstMessage: r.first_message,
        lastMessage: r.last_message,
        avgLength: r.avg_length || 0,
        count: 0
      });
    }
    
    const contact = contactMap.get(key);
    contact.messageCount += r.message_count;
    contact.sent += r.sent;
    contact.received += r.received;
    contact.firstMessage = Math.min(contact.firstMessage || Infinity, r.first_message || Infinity);
    contact.lastMessage = Math.max(contact.lastMessage || 0, r.last_message || 0);
    // Weighted average for avg_length
    contact.avgLength = (contact.avgLength * contact.count + (r.avg_length || 0)) / (contact.count + 1);
    contact.count++;
  }
  
  return [...contactMap.values()]
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 50)
    .map(r => ({
      identifier: r.identifier,
      name: r.name,
      messageCount: r.messageCount,
      sent: r.sent,
      received: r.received,
      ratio: r.sent && r.received ? (r.sent / r.received).toFixed(2) : null,
      avgLength: Math.round(r.avgLength || 0),
      firstMessage: convertMacTime(r.firstMessage),
      lastMessage: convertMacTime(r.lastMessage),
      relationshipDays: r.firstMessage && r.lastMessage 
        ? Math.floor((r.lastMessage - r.firstMessage) / 1000000000 / 86400) 
        : 0
    }));
}

/**
 * Compute hourly activity patterns
 */
async function computeHourlyActivity() {
  return dbAll(`
    SELECT 
      CAST(strftime('%H', datetime(date/1000000000 + 978307200, 'unixepoch', 'localtime')) AS INTEGER) as hour,
      COUNT(*) as count,
      SUM(CASE WHEN is_from_me = 1 THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN is_from_me = 0 THEN 1 ELSE 0 END) as received
    FROM message
    WHERE date > 0
    GROUP BY hour
    ORDER BY hour
  `);
}

/**
 * Compute daily activity patterns
 */
async function computeDailyActivity() {
  return dbAll(`
    SELECT 
      CAST(strftime('%w', datetime(date/1000000000 + 978307200, 'unixepoch', 'localtime')) AS INTEGER) as day,
      COUNT(*) as count
    FROM message
    WHERE date > 0
    GROUP BY day
    ORDER BY day
  `);
}

/**
 * Compute group chat data for network graph
 */
async function computeGroupChats() {
  return dbAll(`
    SELECT 
      c.ROWID as chat_id,
      c.display_name as group_name,
      GROUP_CONCAT(DISTINCT h.id) as members
    FROM chat c
    JOIN chat_handle_join chj ON c.ROWID = chj.chat_id
    JOIN handle h ON chj.handle_id = h.ROWID
    WHERE c.display_name IS NOT NULL AND c.display_name != ''
    GROUP BY c.ROWID
    HAVING COUNT(DISTINCT h.id) >= 2
  `);
}

/**
 * Build network graph from group chat connections
 */
function buildNetworkGraph(groupChats, topContacts) {
  const nodeMap = new Map();
  const edgeMap = new Map();

  for (const group of groupChats) {
    const members = (group.members || '').split(',').filter(m => m);
    const memberKeys = members.map(member => {
      const name = getDisplayName(member);
      const contactId = getContactId(member);
      return { key: contactId || name, name, identifier: member };
    });
    
    // Add nodes
    for (const { key, name } of memberKeys) {
      if (!nodeMap.has(key)) {
        nodeMap.set(key, { id: key, name, groups: 1, messageCount: 0 });
      } else {
        nodeMap.get(key).groups++;
      }
    }

    // Add edges between all pairs
    for (let i = 0; i < memberKeys.length; i++) {
      for (let j = i + 1; j < memberKeys.length; j++) {
        if (memberKeys[i].key === memberKeys[j].key) continue;
        
        const edgeKey = [memberKeys[i].key, memberKeys[j].key].sort().join('|');
        if (!edgeMap.has(edgeKey)) {
          edgeMap.set(edgeKey, { 
            source: memberKeys[i].key, 
            target: memberKeys[j].key, 
            weight: 1,
            groups: [group.group_name]
          });
        } else {
          edgeMap.get(edgeKey).weight++;
          edgeMap.get(edgeKey).groups.push(group.group_name);
        }
      }
    }
  }

  // Enrich nodes with message counts from topContacts
  for (const contact of topContacts) {
    for (const node of nodeMap.values()) {
      if (node.name === contact.name) {
        node.messageCount = contact.messageCount;
        break;
      }
    }
  }

  return {
    nodes: Array.from(nodeMap.values()).slice(0, 100),
    edges: Array.from(edgeMap.values()).slice(0, 200)
  };
}

/**
 * Compute monthly activity timeline
 */
async function computeTimeline() {
  const rows = await dbAll(`
    SELECT 
      strftime('%Y-%m', datetime(date/1000000000 + 978307200, 'unixepoch')) as month,
      COUNT(*) as count,
      COUNT(DISTINCT h.id) as unique_contacts
    FROM message m
    JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
    JOIN chat_handle_join chj ON cmj.chat_id = chj.chat_id
    JOIN handle h ON chj.handle_id = h.ROWID
    WHERE date > 0
    GROUP BY month
    ORDER BY month DESC
    LIMIT 24
  `);
  
  return rows.reverse().map(r => ({
    month: r.month,
    count: r.count,
    uniqueContacts: r.unique_contacts
  }));
}

/**
 * Compute media statistics
 */
async function computeMediaStats() {
  const rows = await dbAll(`
    SELECT 
      SUM(CASE WHEN a.mime_type LIKE 'image/%' THEN 1 ELSE 0 END) as images,
      SUM(CASE WHEN a.mime_type LIKE 'video/%' THEN 1 ELSE 0 END) as videos,
      SUM(CASE WHEN a.mime_type LIKE 'audio/%' THEN 1 ELSE 0 END) as audio,
      COUNT(*) as total_media
    FROM attachment a
    WHERE a.filename IS NOT NULL
  `);
  
  const row = rows[0] || {};
  return {
    images: row.images || 0,
    videos: row.videos || 0,
    audio: row.audio || 0,
    total: row.total_media || 0
  };
}

/**
 * Compute response time metrics
 * Uses a proper window function approach to find actual next messages
 */
async function computeResponseMetrics() {
  // This query properly finds the next message in the same chat
  // by using a self-join with date ordering
  const rows = await dbAll(`
    WITH message_pairs AS (
      SELECT 
        m1.ROWID as msg_id,
        m1.date as received_date,
        m1.is_from_me as received_from_me,
        cmj1.chat_id,
        h.id as identifier,
        (
          SELECT MIN(m2.date)
          FROM message m2
          JOIN chat_message_join cmj2 ON m2.ROWID = cmj2.message_id
          WHERE cmj2.chat_id = cmj1.chat_id
            AND m2.date > m1.date
            AND m2.is_from_me = 1
            AND m1.is_from_me = 0
        ) as response_date
      FROM message m1
      JOIN chat_message_join cmj1 ON m1.ROWID = cmj1.message_id
      JOIN chat_handle_join chj ON cmj1.chat_id = chj.chat_id
      JOIN handle h ON chj.handle_id = h.ROWID
      WHERE m1.date > 0 AND m1.is_from_me = 0
    )
    SELECT 
      identifier,
      AVG((response_date - received_date) / 1000000000.0 / 60.0) as avg_response_minutes
    FROM message_pairs
    WHERE response_date IS NOT NULL
      AND (response_date - received_date) > 0
      AND (response_date - received_date) / 1000000000.0 / 60.0 < 1440
    GROUP BY identifier
    HAVING avg_response_minutes > 0
    ORDER BY avg_response_minutes ASC
    LIMIT 20
  `);
  
  return rows
    .filter(r => r.avg_response_minutes > 0)
    .map(r => ({
      identifier: r.identifier,
      name: getDisplayName(r.identifier),
      avgResponseMinutes: Math.round(r.avg_response_minutes)
    }));
}

/**
 * Compute conversation streaks (most conversation days)
 */
async function computeStreaks() {
  const rows = await dbAll(`
    SELECT 
      h.id as identifier,
      COUNT(DISTINCT date(datetime(m.date/1000000000 + 978307200, 'unixepoch'))) as conversation_days
    FROM message m
    JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
    JOIN chat_handle_join chj ON cmj.chat_id = chj.chat_id
    JOIN handle h ON chj.handle_id = h.ROWID
    WHERE m.date > 0
    GROUP BY h.id
    ORDER BY conversation_days DESC
    LIMIT 10
  `);
  
  return rows.map(r => ({
    identifier: r.identifier,
    name: getDisplayName(r.identifier),
    days: r.conversation_days
  }));
}

module.exports = {
  computeInsights
};
