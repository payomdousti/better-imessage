import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';

// ============================================================
// INSIGHTS DASHBOARD
// Network analysis, temporal patterns, and content analytics
// ============================================================

// Stat Card Component
const StatCard = memo(function StatCard({ label, value, subtitle, icon, color = 'primary' }) {
  const colors = {
    primary: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30',
    green: 'from-emerald-500/20 to-green-500/20 border-emerald-500/30',
    purple: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
    cyan: 'from-cyan-500/20 to-sky-500/20 border-cyan-500/30'
  };
  
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {icon && <div className="text-2xl opacity-50">{icon}</div>}
      </div>
    </div>
  );
});

// Bar Chart Component
const BarChart = memo(function BarChart({ data, labelKey, valueKey, maxBars = 10, color = '#6366f1' }) {
  const maxValue = Math.max(...data.map(d => d[valueKey]), 1);
  const displayData = data.slice(0, maxBars);
  
  return (
    <div className="space-y-2">
      {displayData.map((item, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <div className="w-24 text-xs text-muted-foreground truncate text-right">
            {item[labelKey]}
          </div>
          <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${(item[valueKey] / maxValue) * 100}%`,
                background: `linear-gradient(90deg, ${color}, ${color}88)`
              }}
            />
          </div>
          <div className="w-16 text-xs text-muted-foreground">
            {item[valueKey].toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
});

// Hour Heatmap Component
const HourHeatmap = memo(function HourHeatmap({ data }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: 24 }, (_, hour) => {
        const hourData = data.find(d => d.hour === hour) || { count: 0 };
        const intensity = hourData.count / maxCount;
        return (
          <div
            key={hour}
            className="relative group"
          >
            <div
              className="w-8 h-8 rounded-md border border-white/10 flex items-center justify-center text-xs font-medium transition-transform hover:scale-110"
              style={{
                background: `rgba(99, 102, 241, ${intensity * 0.8 + 0.1})`,
                color: intensity > 0.5 ? 'white' : 'rgba(255,255,255,0.7)'
              }}
            >
              {hour}
            </div>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover border rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              {hourData.count.toLocaleString()} messages at {hour}:00
            </div>
          </div>
        );
      })}
    </div>
  );
});

// Day of Week Chart
const DayChart = memo(function DayChart({ data }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  
  return (
    <div className="flex items-end justify-between gap-2 h-32">
      {data.map((day, idx) => {
        const height = (day.count / maxCount) * 100;
        return (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
            <div 
              className="w-full rounded-t-md transition-all duration-500 hover:opacity-80"
              style={{ 
                height: `${height}%`,
                background: 'linear-gradient(180deg, #6366f1, #8b5cf6)'
              }}
            />
            <span className="text-xs text-muted-foreground">{day.day.slice(0, 3)}</span>
          </div>
        );
      })}
    </div>
  );
});

// Timeline Chart
const TimelineChart = memo(function TimelineChart({ data }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  
  return (
    <div className="relative h-40">
      <svg className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="timelineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {/* Area */}
        <path
          d={`
            M 0 ${140}
            ${data.map((d, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = 140 - (d.count / maxCount) * 120;
              return `L ${x}% ${y}`;
            }).join(' ')}
            L 100% ${140}
            Z
          `}
          fill="url(#timelineGradient)"
        />
        {/* Line */}
        <path
          d={`
            M 0 ${140 - (data[0]?.count / maxCount) * 120}
            ${data.map((d, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = 140 - (d.count / maxCount) * 120;
              return `L ${x}% ${y}`;
            }).join(' ')}
          `}
          fill="none"
          stroke="#6366f1"
          strokeWidth="2"
        />
        {/* Points */}
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * 100;
          const y = 140 - (d.count / maxCount) * 120;
          return (
            <circle
              key={i}
              cx={`${x}%`}
              cy={y}
              r="3"
              fill="#6366f1"
              className="hover:r-5 transition-all"
            />
          );
        })}
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground mt-2">
        <span>{data[0]?.month}</span>
        <span>{data[data.length - 1]?.month}</span>
      </div>
    </div>
  );
});

// Network Graph Component (Force-directed simulation)
const NetworkGraph = memo(function NetworkGraph({ nodes, edges }) {
  const [positions, setPositions] = useState([]);
  const [hoveredNode, setHoveredNode] = useState(null);
  
  // Simple force-directed layout
  useEffect(() => {
    if (nodes.length === 0) return;
    
    const width = 600;
    const height = 400;
    const padding = 50;
    
    // Initialize positions
    let pos = nodes.map((node, i) => ({
      id: node.id,
      x: padding + Math.random() * (width - padding * 2),
      y: padding + Math.random() * (height - padding * 2),
      vx: 0,
      vy: 0,
      node
    }));
    
    // Run simulation
    const iterations = 100;
    for (let iter = 0; iter < iterations; iter++) {
      const alpha = 1 - iter / iterations;
      
      // Repulsion between nodes
      for (let i = 0; i < pos.length; i++) {
        for (let j = i + 1; j < pos.length; j++) {
          const dx = pos[j].x - pos[i].x;
          const dy = pos[j].y - pos[i].y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = 500 / (dist * dist) * alpha;
          
          pos[i].vx -= (dx / dist) * force;
          pos[i].vy -= (dy / dist) * force;
          pos[j].vx += (dx / dist) * force;
          pos[j].vy += (dy / dist) * force;
        }
      }
      
      // Attraction along edges
      edges.forEach(edge => {
        const source = pos.find(p => p.id === edge.source);
        const target = pos.find(p => p.id === edge.target);
        if (!source || !target) return;
        
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = dist * 0.01 * edge.weight * alpha;
        
        source.vx += (dx / dist) * force;
        source.vy += (dy / dist) * force;
        target.vx -= (dx / dist) * force;
        target.vy -= (dy / dist) * force;
      });
      
      // Center gravity
      pos.forEach(p => {
        p.vx += (width / 2 - p.x) * 0.01 * alpha;
        p.vy += (height / 2 - p.y) * 0.01 * alpha;
      });
      
      // Apply velocities
      pos.forEach(p => {
        p.x = Math.max(padding, Math.min(width - padding, p.x + p.vx * 0.1));
        p.y = Math.max(padding, Math.min(height - padding, p.y + p.vy * 0.1));
        p.vx *= 0.9;
        p.vy *= 0.9;
      });
    }
    
    setPositions(pos);
  }, [nodes, edges]);
  
  const maxMessages = Math.max(...nodes.map(n => n.messageCount || 1), 1);
  
  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No group chat connections found
      </div>
    );
  }
  
  return (
    <div className="relative w-full h-96 bg-gradient-to-br from-background to-muted/20 rounded-xl overflow-hidden border">
      <svg className="w-full h-full">
        {/* Edges */}
        {edges.map((edge, i) => {
          const source = positions.find(p => p.id === edge.source);
          const target = positions.find(p => p.id === edge.target);
          if (!source || !target) return null;
          
          const isHovered = hoveredNode === edge.source || hoveredNode === edge.target;
          
          return (
            <line
              key={i}
              x1={`${(source.x / 600) * 100}%`}
              y1={`${(source.y / 400) * 100}%`}
              x2={`${(target.x / 600) * 100}%`}
              y2={`${(target.y / 400) * 100}%`}
              stroke={isHovered ? '#6366f1' : '#6366f133'}
              strokeWidth={Math.min(edge.weight + 1, 4)}
              className="transition-all duration-200"
            />
          );
        })}
        
        {/* Nodes */}
        {positions.map((pos, i) => {
          const size = 8 + (pos.node.messageCount / maxMessages) * 20;
          const isHovered = hoveredNode === pos.id;
          
          return (
            <g 
              key={i}
              onMouseEnter={() => setHoveredNode(pos.id)}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer"
            >
              <circle
                cx={`${(pos.x / 600) * 100}%`}
                cy={`${(pos.y / 400) * 100}%`}
                r={isHovered ? size * 1.3 : size}
                fill={isHovered ? '#6366f1' : '#8b5cf6'}
                className="transition-all duration-200"
                style={{ filter: isHovered ? 'drop-shadow(0 0 8px #6366f1)' : 'none' }}
              />
              {(isHovered || size > 15) && (
                <text
                  x={`${(pos.x / 600) * 100}%`}
                  y={`${(pos.y / 400) * 100 + (isHovered ? -size/4 - 3 : 0)}%`}
                  textAnchor="middle"
                  dy={isHovered ? -size : size + 12}
                  className="text-xs fill-foreground pointer-events-none"
                  style={{ fontSize: '10px' }}
                >
                  {pos.node.name.split(' ')[0]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      
      {/* Hovered node tooltip */}
      {hoveredNode && positions.find(p => p.id === hoveredNode) && (
        <div className="absolute top-4 left-4 bg-popover/95 backdrop-blur border rounded-lg p-3 text-sm">
          <div className="font-medium">{positions.find(p => p.id === hoveredNode)?.node.name}</div>
          <div className="text-muted-foreground text-xs mt-1">
            {positions.find(p => p.id === hoveredNode)?.node.messageCount.toLocaleString()} messages
          </div>
          <div className="text-muted-foreground text-xs">
            {positions.find(p => p.id === hoveredNode)?.node.groups} shared groups
          </div>
        </div>
      )}
      
      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
        {nodes.length} contacts · {edges.length} connections
      </div>
    </div>
  );
});

// Top Contact Card
const TopContactCard = memo(function TopContactCard({ contact, rank }) {
  const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
        style={{ 
          background: rank < 3 ? medalColors[rank] : '#6366f133',
          color: rank < 3 ? '#000' : '#fff'
        }}
      >
        {rank + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{contact.name}</div>
        <div className="text-xs text-muted-foreground">
          {contact.messageCount.toLocaleString()} messages · {contact.relationshipDays} days
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium text-green-500">
          ↑ {contact.sent.toLocaleString()}
        </div>
        <div className="text-sm font-medium text-blue-500">
          ↓ {contact.received.toLocaleString()}
        </div>
      </div>
    </div>
  );
});

// Main Insights Component
export default function Insights() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  
  useEffect(() => {
    setLoading(true);
    fetch('/insights')
      .then(res => res.json())
      .then(data => {
        setInsights(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);
  
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground">Analyzing your messages...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-500">
        Failed to load insights: {error}
      </div>
    );
  }
  
  if (!insights) return null;
  
  const sections = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'network', label: 'Network', icon: '🕸️' },
    { id: 'activity', label: 'Activity', icon: '📈' },
    { id: 'contacts', label: 'Top Contacts', icon: '👥' }
  ];
  
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-br from-background to-muted/10">
      {/* Section Nav */}
      <div className="flex-shrink-0 border-b bg-background/80 backdrop-blur">
        <div className="flex gap-1 p-2 overflow-x-auto">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeSection === section.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <span className="mr-2">{section.icon}</span>
              {section.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {activeSection === 'overview' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            <div>
              <h2 className="text-2xl font-bold mb-1">Message Insights</h2>
              <p className="text-muted-foreground">Analytics across your entire message history</p>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard 
                label="Total Messages" 
                value={insights.overview.totalMessages.toLocaleString()}
                icon="💬"
                color="primary"
              />
              <StatCard 
                label="Messages Sent" 
                value={insights.overview.sent.toLocaleString()}
                subtitle={`${((insights.overview.sent / insights.overview.totalMessages) * 100).toFixed(1)}% of total`}
                icon="📤"
                color="green"
              />
              <StatCard 
                label="Messages Received" 
                value={insights.overview.received.toLocaleString()}
                subtitle={`${((insights.overview.received / insights.overview.totalMessages) * 100).toFixed(1)}% of total`}
                icon="📥"
                color="purple"
              />
              <StatCard 
                label="Active Days" 
                value={insights.overview.activeDays.toLocaleString()}
                icon="📅"
                color="cyan"
              />
            </div>
            
            {/* Media Breakdown */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card border rounded-xl p-5">
                <h3 className="font-semibold mb-4">📷 Media Breakdown</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/30">
                    <div className="text-3xl mb-1">🖼️</div>
                    <div className="text-2xl font-bold">{insights.contentAnalysis.media.images.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Photos</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/30">
                    <div className="text-3xl mb-1">🎬</div>
                    <div className="text-2xl font-bold">{insights.contentAnalysis.media.videos.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Videos</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/30">
                    <div className="text-3xl mb-1">🎵</div>
                    <div className="text-2xl font-bold">{insights.contentAnalysis.media.audio.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Audio</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-card border rounded-xl p-5">
                <h3 className="font-semibold mb-4">🔥 Conversation Streaks</h3>
                <div className="space-y-2">
                  {insights.streaks.slice(0, 5).map((streak, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <span className="font-medium">{streak.name}</span>
                      <span className="text-sm text-muted-foreground">{streak.days} days</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Timeline */}
            <div className="bg-card border rounded-xl p-5">
              <h3 className="font-semibold mb-4">📈 Activity Over Time</h3>
              {insights.timeline.length > 0 ? (
                <TimelineChart data={insights.timeline} />
              ) : (
                <div className="text-muted-foreground text-center py-8">No timeline data available</div>
              )}
            </div>
          </div>
        )}
        
        {activeSection === 'network' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            <div>
              <h2 className="text-2xl font-bold mb-1">Social Network</h2>
              <p className="text-muted-foreground">Connections through group chats</p>
            </div>
            
            <NetworkGraph 
              nodes={insights.networkGraph.nodes} 
              edges={insights.networkGraph.edges} 
            />
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card border rounded-xl p-5">
                <h3 className="font-semibold mb-4">🔗 Strongest Connections</h3>
                <div className="space-y-2">
                  {insights.networkGraph.edges
                    .sort((a, b) => b.weight - a.weight)
                    .slice(0, 8)
                    .map((edge, i) => {
                      const sourceName = insights.networkGraph.nodes.find(n => n.id === edge.source)?.name || edge.source;
                      const targetName = insights.networkGraph.nodes.find(n => n.id === edge.target)?.name || edge.target;
                      return (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                          <span className="text-sm font-medium">{sourceName.split(' ')[0]}</span>
                          <span className="text-muted-foreground">↔</span>
                          <span className="text-sm font-medium">{targetName.split(' ')[0]}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{edge.weight} groups</span>
                        </div>
                      );
                    })}
                </div>
              </div>
              
              <div className="bg-card border rounded-xl p-5">
                <h3 className="font-semibold mb-4">⭐ Most Connected People</h3>
                <div className="space-y-2">
                  {insights.networkGraph.nodes
                    .sort((a, b) => b.groups - a.groups)
                    .slice(0, 8)
                    .map((node, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: '#8b5cf6' }}
                        >
                          {i + 1}
                        </div>
                        <span className="font-medium flex-1">{node.name}</span>
                        <span className="text-xs text-muted-foreground">{node.groups} groups</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeSection === 'activity' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            <div>
              <h2 className="text-2xl font-bold mb-1">Activity Patterns</h2>
              <p className="text-muted-foreground">When you message the most</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card border rounded-xl p-5">
                <h3 className="font-semibold mb-4">⏰ Messages by Hour</h3>
                <HourHeatmap data={insights.activityPatterns.byHour} />
              </div>
              
              <div className="bg-card border rounded-xl p-5">
                <h3 className="font-semibold mb-4">📆 Messages by Day</h3>
                {insights.activityPatterns.byDayOfWeek.length > 0 ? (
                  <DayChart data={insights.activityPatterns.byDayOfWeek} />
                ) : (
                  <div className="text-muted-foreground text-center py-8">No data available</div>
                )}
              </div>
            </div>
            
            {/* Peak times insight */}
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-5">
              <h3 className="font-semibold mb-3">💡 Insights</h3>
              <div className="grid md:grid-cols-3 gap-4">
                {(() => {
                  const peakHour = insights.activityPatterns.byHour.reduce((max, h) => 
                    h.count > (max?.count || 0) ? h : max, null);
                  const peakDay = insights.activityPatterns.byDayOfWeek.reduce((max, d) => 
                    d.count > (max?.count || 0) ? d : max, null);
                  const avgPerDay = Math.round(insights.overview.totalMessages / insights.overview.activeDays);
                  
                  return (
                    <>
                      <div className="text-center p-4 rounded-lg bg-white/5">
                        <div className="text-3xl mb-2">🕐</div>
                        <div className="font-bold">{peakHour?.hour}:00</div>
                        <div className="text-xs text-muted-foreground">Peak messaging hour</div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-white/5">
                        <div className="text-3xl mb-2">📅</div>
                        <div className="font-bold">{peakDay?.day}</div>
                        <div className="text-xs text-muted-foreground">Most active day</div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-white/5">
                        <div className="text-3xl mb-2">📊</div>
                        <div className="font-bold">{avgPerDay}</div>
                        <div className="text-xs text-muted-foreground">Avg messages/day</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
        
        {activeSection === 'contacts' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div>
              <h2 className="text-2xl font-bold mb-1">Top Contacts</h2>
              <p className="text-muted-foreground">Your most messaged people</p>
            </div>
            
            {/* Podium for top 3 */}
            <div className="flex items-end justify-center gap-4 py-8">
              {insights.topContacts.slice(0, 3).map((contact, i) => {
                const order = [1, 0, 2][i]; // 2nd, 1st, 3rd
                const heights = ['h-32', 'h-40', 'h-24'];
                const actual = insights.topContacts[order];
                if (!actual) return null;
                
                return (
                  <div key={order} className="flex flex-col items-center" style={{ order: i }}>
                    <div className="text-center mb-2">
                      <div className="font-bold truncate max-w-24">{actual.name.split(' ')[0]}</div>
                      <div className="text-xs text-muted-foreground">{actual.messageCount.toLocaleString()}</div>
                    </div>
                    <div 
                      className={`w-24 ${heights[order]} rounded-t-lg flex items-end justify-center pb-4`}
                      style={{ 
                        background: `linear-gradient(180deg, ${['#C0C0C0', '#FFD700', '#CD7F32'][order]}, ${['#8e8e8e', '#B8860B', '#8B4513'][order]})`
                      }}
                    >
                      <span className="text-2xl font-bold text-white">{order + 1}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Full list */}
            <div className="bg-card border rounded-xl p-5">
              <h3 className="font-semibold mb-4">📋 All Top Contacts</h3>
              <div className="space-y-2">
                {insights.topContacts.slice(0, 20).map((contact, i) => (
                  <TopContactCard key={i} contact={contact} rank={i} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

