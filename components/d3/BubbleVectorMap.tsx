"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useNodeData } from '@/lib/hooks/useNodeData';
import { useUIStore } from '@/lib/stores/uiStore';
import { NodeData, NodeStatus } from '@/types';
import { getDetailedErrorMessage } from '@/lib/errorMappings';
import './BubbleVectorMap.css';

/**
 * Bubble Vector Map (D3 Implementation)
 * Replicates the visual style and behavior of CONTOH/bubble-map.html
 */

const CONFIG = {
    minRadius: 40, // Increased to fit text inside
    maxRadius: 70, // Reduced slightly to balance
    padding: 3,
    forceStrength: 0.05
};

const STATUS_COLORS: Record<string, string> = {
    'UP': '#10b981',
    'STABLE': '#10b981', // Map STABLE to UP color
    'FRESH': '#10b981',  // Map FRESH to UP color
    'DOWN': '#ef4444',
    'WARNING': '#f59e0b',
    'TIMEOUT': '#f59e0b',
    'ERROR': '#ef4444',
    'UNKNOWN': '#94a3b8'
};

const STATUS_ICONS: Record<string, string> = {
    'UP': '✓',
    'STABLE': '✓',
    'FRESH': '⚡',
    'DOWN': '✕',
    'WARNING': '⚠',
    'TIMEOUT': '⏱',
    'UNKNOWN': '?'
};

export function BubbleVectorMap() {
    const svgRef = useRef<SVGSVGElement>(null);
    const { nodes } = useNodeData();
    const openSidePanel = useUIStore(state => state.openSidePanel);
    const [tooltip, setTooltip] = useState<{
        visible: boolean;
        x: number;
        y: number;
        data: any;
    } | null>(null);

    // Filter state (local for now, could be moved to store)
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        if (!svgRef.current || nodes.length === 0) return;

        const svg = d3.select(svgRef.current);
        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;

        // Clear previous render
        svg.selectAll('*').remove();

        // Create main group
        const g = svg.append('g');

        // Prepare data with simulation properties
        // const responseTimes = nodes.map((n: any) => n.latency || 1000).filter((rt: any) => rt > 0);
        // const minTime = Math.min(...responseTimes, 100);
        // const maxTime = Math.max(...responseTimes, 5000);

        const radiusScale = d3.scaleLinear()
            .domain([0, 5000]) // Fixed domain 0-5s for consistent sizing
            .range([CONFIG.minRadius, CONFIG.maxRadius])
            .clamp(true); // Cap size at maxRadius even if > 5000ms

        const simulationData = nodes.map((node: any) => ({
            ...node,
            // Map internal status to visual status keys if needed
            visualStatus: node.status,
            radius: radiusScale(node.latency || 1000),
            color: STATUS_COLORS[node.status] || STATUS_COLORS['UNKNOWN'],
            // Initial random position near center
            x: width / 2 + (Math.random() - 0.5) * 50,
            y: height / 2 + (Math.random() - 0.5) * 50
        }));

        // Filter data
        const filteredData = filter === 'all'
            ? simulationData
            : simulationData.filter((d: any) => d.status === filter);

        // Force Simulation
        const simulation = d3.forceSimulation<any>(filteredData)
            .force('charge', d3.forceManyBody().strength(5))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius((d: any) => d.radius + CONFIG.padding))
            .force('x', d3.forceX(width / 2).strength(CONFIG.forceStrength))
            .force('y', d3.forceY(height / 2).strength(CONFIG.forceStrength));

        // Render Nodes
        const atoms = g.selectAll('.atom')
            .data(filteredData)
            .join('g')
            .attr('class', 'atom-node')
            .call(d3.drag<any, any>()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended)
            )
            .on('click', (event: any, d: any) => {
                event.stopPropagation();
                openSidePanel(d.id);
            })
            .on('mouseover', (event: any, d: any) => {
                setTooltip({
                    visible: true,
                    x: event.pageX,
                    y: event.pageY,
                    data: d
                });

                // Scale up effect
                d3.select(event.currentTarget).select('circle')
                    .transition().duration(200)
                    .attr('r', d.radius * 1.1);
            })
            .on('mouseout', (event: any, d: any) => {
                setTooltip(null);
                // Scale down effect
                d3.select(event.currentTarget).select('circle')
                    .transition().duration(200)
                    .attr('r', d.radius);
            });

        // Circle
        atoms.append('circle')
            .attr('class', 'atom-circle')
            .attr('r', (d: any) => d.radius)
            .attr('fill', (d: any) => d.color);

        // Pulse Animation for DOWN/WARNING
        atoms.filter((d: any) => d.status === 'DOWN' || d.status === 'WARNING')
            .append('circle')
            .attr('class', 'pulse-ring')
            .attr('r', (d: any) => d.radius)
            .attr('stroke', '#ef4444')
            .each(function (d: any) {
                const circle = d3.select(this);
                function repeat() {
                    circle
                        .attr('r', d.radius)
                        .attr('opacity', 1)
                        .transition()
                        .duration(1500)
                        .ease(d3.easeLinear)
                        .attr('r', d.radius + 20)
                        .attr('opacity', 0)
                        .on('end', repeat);
                }
                repeat();
            });

        // Icon (Moved UP)
        atoms.append('text')
            .attr('class', 'atom-icon')
            .text((d: any) => STATUS_ICONS[d.status] || '?')
            .attr('dy', -12)
            .style('font-size', (d: any) => `${d.radius * 0.5}px`);

        // Label (Moved INSIDE - Center)
        atoms.append('text')
            .attr('class', 'atom-label')
            .text((d: any) => {
                // Shorter truncation for inside text
                const maxLength = Math.floor(d.radius / 3.5);
                return d.name.length > maxLength ? d.name.substring(0, maxLength) + '..' : d.name;
            })
            .attr('dy', 4)
            .style('fill', 'white')
            .style('font-weight', '700')
            .style('font-size', '0.7rem'); // Fixed readable size

        // Response Time (Moved DOWN)
        atoms.append('text')
            .attr('class', 'atom-response')
            .text((d: any) => d.latency ? `${d.latency}ms` : 'T/A')
            .attr('dy', 16)
            .style('font-size', '0.6rem')
            .style('opacity', 0.8);

        // Simulation Tick
        simulation.on('tick', () => {
            atoms.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
        });

        // Resize Listener with debounce
        let resizeTimeout: NodeJS.Timeout;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (!svgRef.current) return;
                const newWidth = svgRef.current.clientWidth;
                const newHeight = svgRef.current.clientHeight;

                svg.attr('width', newWidth).attr('height', newHeight);

                simulation.force('center', d3.forceCenter(newWidth / 2, newHeight / 2));
                simulation.force('x', d3.forceX(newWidth / 2).strength(CONFIG.forceStrength));
                simulation.force('y', d3.forceY(newHeight / 2).strength(CONFIG.forceStrength));
                simulation.alpha(0.3).restart();
            }, 200);
        };

        window.addEventListener('resize', handleResize, { passive: true });

        // Drag functions
        function dragstarted(event: any, d: any) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event: any, d: any) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event: any, d: any) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        // Cleanup
        return () => {
            simulation.stop();
            clearTimeout(resizeTimeout);
            window.removeEventListener('resize', handleResize);
        };

    }, [nodes, filter, openSidePanel]); // Re-run when nodes or filter changes

    return (
        <div className="vector-container">
            <svg ref={svgRef} id="vector-chart"></svg>

            {/* Tooltip */}
            {tooltip && tooltip.visible && (
                <div
                    className="vector-tooltip visible"
                    style={{ left: tooltip.x + 15, top: tooltip.y + 15 }}
                >
                    <div className="tooltip-name">{tooltip.data.name}</div>
                    <div className="tooltip-status">
                        <span className={`status-badge status-${tooltip.data.status}`}>
                            {tooltip.data.status}
                        </span>
                    </div>
                    <div className="tooltip-info">
                        ⚡ Respon: <strong>{tooltip.data.latency}ms</strong>
                    </div>
                    {tooltip.data.httpStatus && (
                        <div className="tooltip-info">
                            📡 HTTP: <strong>{tooltip.data.httpStatus}</strong>
                        </div>
                    )}

                    {/* Detailed Error Info */}
                    {/* Detailed Error/Warning Info */}
                    {(() => {
                        const errorDetail = getDetailedErrorMessage(tooltip.data);
                        if (errorDetail) {
                            const isWarning = tooltip.data.status === "WARNING";
                            const color = isWarning ? "#fcd34d" : "#fca5a5"; // Amber-300 vs Red-300
                            const borderColor = isWarning ? "rgba(252, 211, 77, 0.3)" : "rgba(239, 68, 68, 0.3)";

                            return (
                                <div className="tooltip-info" style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${borderColor}`, color: color }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{errorDetail.title}</div>
                                    <div style={{ fontSize: '0.9em', opacity: 0.9, lineHeight: 1.3 }}>{errorDetail.description}</div>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    <div className="tooltip-info" style={{ wordBreak: 'break-all', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        {tooltip.data.url}
                    </div>
                </div>
            )}
        </div>
    );
}
