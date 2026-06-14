import React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Link,
  Row,
  Column,
} from "@react-email/components";

interface FeedbackEmailProps {
  category: "bug" | "feature" | "improvement" | "general";
  subject: string;
  details: string;
  priority: "low" | "medium" | "high" | "critical";
  email?: string | null;
  pageUrl?: string;
  timestamp?: string;
  rating?: number | null;
  attachment?: { name: string; size: string } | null;
}

export default function FeedbackEmailTemplate({
  category = "bug",
  subject = "Cannot sync extension attempts",
  details = "When attempting to sync code challenges completed on LeetCode, the sync spinner spins infinitely without logging an attempt details row.",
  priority = "high",
  email = "user@example.com",
  pageUrl = "https://deepfocus.site/workspace",
  timestamp = new Date().toISOString(),
  rating = null,
  attachment = null,
}: FeedbackEmailProps) {
  const categoryLabels = {
    bug: { label: "Bug Report", bg: "#fef2f2", text: "#ef4444", border: "#fee2e2" },
    feature: { label: "Feature Request", bg: "#eff6ff", text: "#3b82f6", border: "#dbeafe" },
    improvement: { label: "Improvement Suggestion", bg: "#fffbeb", text: "#d97706", border: "#fef3c7" },
    general: { label: "General Feedback", bg: "#faf5ff", text: "#7c3aed", border: "#f3e8ff" },
  };
  const cat = categoryLabels[category] || categoryLabels.general;

  const priorityLabels = {
    low: { label: "Low Priority", bg: "#f0fdf4", text: "#16a34a", border: "#dcfce7" },
    medium: { label: "Medium Priority", bg: "#fffbeb", text: "#d97706", border: "#fef3c7" },
    high: { label: "High Priority", bg: "#fff7ed", text: "#ea580c", border: "#ffedd5" },
    critical: { label: "Critical Blocker", bg: "#fef2f2", text: "#dc2626", border: "#fee2e2" },
  };
  const prio = priorityLabels[priority] || priorityLabels.medium;

  return (
    <Html lang="en">
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Top brand line accent */}
          <Section style={styles.topBar} />

          {/* Header section with brand mark */}
          <Section style={styles.header}>
            <Row style={styles.brandRow}>
              <Column style={styles.brandLogoCol}>
                <img
                  src="https://raw.githubusercontent.com/Saicharan-775/DeepFocus/main/deepfocus-site/public/deepfocus-logo-small.png"
                  alt="DF"
                  style={styles.brandLogoImage}
                  width="28"
                  height="28"
                />
              </Column>
              <Column style={styles.brandNameCol}>
                <Text style={styles.brandName}>DeepFocus</Text>
              </Column>
            </Row>
            <Heading style={styles.title}>New Feedback Received</Heading>
            <Text style={styles.subtitle}>
              A user has submitted feedback through DeepFocus.
            </Text>
          </Section>

          {/* Content Area */}
          <Section style={styles.content}>
            {/* Overview details badges */}
            <Section style={styles.badgesBox}>
              <Row>
                <Column>
                  <Text style={styles.badgeLabel}>Category</Text>
                  <Text
                    style={{
                      ...styles.badge,
                      backgroundColor: cat.bg,
                      color: cat.text,
                      border: `1px solid ${cat.border}`,
                    }}
                  >
                    {cat.label}
                  </Text>
                </Column>
                <Column style={{ textAlign: "right" }}>
                  <Text style={styles.badgeLabel}>Urgency</Text>
                  <Text
                    style={{
                      ...styles.badge,
                      backgroundColor: prio.bg,
                      color: prio.text,
                      border: `1px solid ${prio.border}`,
                    }}
                  >
                    {prio.label}
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* Subject heading */}
            <Section style={styles.sectionSpacing}>
              <Text style={styles.fieldTitle}>Subject</Text>
              <Text style={styles.subjectText}>{subject}</Text>
            </Section>

            {/* Feedback Message Card (Quote Style) */}
            <Section style={styles.sectionSpacing}>
              <Text style={styles.fieldTitle}>Feedback Message</Text>
              <Section style={styles.quoteCard}>
                <Text style={styles.messageText}>{details}</Text>
              </Section>
            </Section>

            {/* Context Box */}
            <Section style={styles.contextCard}>
              <Text style={styles.contextHeader}>Submission Context</Text>
              
              <Row style={styles.contextRow}>
                <Column style={styles.contextLabel}>Sender Email</Column>
                <Column style={styles.contextValue}>
                  {email ? (
                    <Link href={`mailto:${email}`} style={styles.link}>
                      {email}
                    </Link>
                  ) : (
                    <span style={styles.anonymous}>Anonymous</span>
                  )}
                </Column>
              </Row>

              <Row style={styles.contextRow}>
                <Column style={styles.contextLabel}>Origin Page URL</Column>
                <Column style={styles.contextValue}>
                  {pageUrl ? (
                    <Link href={pageUrl} target="_blank" style={styles.link}>
                      View Page Link &rarr;
                    </Link>
                  ) : (
                    <span style={styles.anonymous}>Unknown</span>
                  )}
                </Column>
              </Row>

              {rating && (
                <Row style={styles.contextRow}>
                  <Column style={styles.contextLabel}>User Rating</Column>
                  <Column style={{ ...styles.contextValue, color: "#eab308" }}>
                    {"★".repeat(rating)}{"☆".repeat(5 - rating)} ({rating}/5)
                  </Column>
                </Row>
              )}

              {attachment && (
                <Row style={styles.contextRow}>
                  <Column style={styles.contextLabel}>Attachment</Column>
                  <Column style={{ ...styles.contextValue, color: "#3b82f6" }}>
                    📎 {attachment.name} ({attachment.size})
                  </Column>
                </Row>
              )}

              <Row style={styles.contextRowLast}>
                <Column style={styles.contextLabel}>Timestamp</Column>
                <Column style={styles.contextValue}>
                  {new Date(timestamp).toLocaleString("en-US", { timeZone: "UTC" })} UTC
                </Column>
              </Row>
            </Section>
          </Section>

          {/* Footer Branding */}
          <Section style={styles.footer}>
            <Text style={styles.footerBranding}>
              Powered by DeepFocus Feedback System
            </Text>
            <Text style={styles.footerTagline}>Build real intuition.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Inline typography and layout CSS objects following React Email specifications
const styles = {
  body: {
    backgroundColor: "#f8fafc",
    margin: "0",
    padding: "0",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  container: {
    maxWidth: "540px",
    margin: "40px auto",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.03), 0 1px 4px rgba(15, 23, 42, 0.02)",
  },
  topBar: {
    backgroundColor: "#7c3aed",
    height: "4px",
    width: "100%",
  },
  brandRow: {
    width: "100%",
    marginBottom: "20px",
  },
  brandLogoCol: {
    width: "32px",
    verticalAlign: "middle",
  },
  brandLogoImage: {
    display: "block",
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    border: "1px solid #f1f5f9",
  },
  brandNameCol: {
    verticalAlign: "middle",
    paddingLeft: "8px",
  },
  brandName: {
    margin: "0",
    fontWeight: "700",
    fontSize: "13px",
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
    color: "#0f172a",
  },
  header: {
    padding: "32px 32px 24px",
    borderBottom: "1px solid #f1f5f9",
  },
  title: {
    margin: "0 0 6px",
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.025em",
    lineHeight: "1.25",
  },
  subtitle: {
    margin: "0",
    fontSize: "13px",
    color: "#64748b",
    fontWeight: "400",
  },
  content: {
    padding: "32px",
  },
  badgesBox: {
    marginBottom: "24px",
  },
  badgeLabel: {
    margin: "0 0 6px",
    fontSize: "10px",
    fontWeight: "700",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "#94a3b8",
  },
  badge: {
    display: "inline-block",
    padding: "4px 8px",
    fontSize: "10px",
    fontWeight: "700",
    borderRadius: "4px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.025em",
    margin: "0",
  },
  sectionSpacing: {
    marginBottom: "24px",
  },
  fieldTitle: {
    margin: "0 0 6px",
    fontSize: "10px",
    fontWeight: "700",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "#94a3b8",
  },
  subjectText: {
    margin: "0",
    fontSize: "15px",
    color: "#0f172a",
    fontWeight: "600",
    lineHeight: "1.4",
  },
  quoteCard: {
    backgroundColor: "#f8fafc",
    borderLeft: "3px solid #7c3aed",
    borderRadius: "0 8px 8px 0",
    padding: "16px 20px",
    borderTop: "1px solid #f1f5f9",
    borderRight: "1px solid #f1f5f9",
    borderBottom: "1px solid #f1f5f9",
  },
  messageText: {
    margin: "0",
    fontSize: "14px",
    lineHeight: "1.6",
    color: "#334155",
    fontWeight: "400",
    whiteSpace: "pre-wrap" as const,
  },
  contextCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  contextHeader: {
    margin: "0",
    padding: "12px 16px",
    borderBottom: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    fontSize: "10px",
    fontWeight: "700",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "#64748b",
  },
  contextRow: {
    fontSize: "12px",
    borderBottom: "1px solid #f1f5f9",
    padding: "10px 16px",
  },
  contextRowLast: {
    fontSize: "12px",
    padding: "10px 16px",
  },
  contextLabel: {
    color: "#64748b",
    fontWeight: "500",
  },
  contextValue: {
    textAlign: "right" as const,
    color: "#0f172a",
    fontWeight: "600",
  },
  link: {
    color: "#7c3aed",
    textDecoration: "none",
    fontWeight: "600",
  },
  anonymous: {
    color: "#94a3b8",
    fontStyle: "italic",
  },
  footer: {
    padding: "24px",
    backgroundColor: "#f8fafc",
    textAlign: "center" as const,
    borderTop: "1px solid #e2e8f0",
  },
  footerBranding: {
    margin: "0",
    fontSize: "10px",
    fontWeight: "700",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "#94a3b8",
  },
  footerTagline: {
    margin: "3px 0 0",
    fontSize: "10px",
    color: "#94a3b8",
    fontWeight: "500",
    fontStyle: "italic",
  },
};

