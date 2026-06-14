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
  Hr,
} from "@react-email/components";

interface FeedbackEmailProps {
  category: "bug" | "feature" | "improvement" | "general";
  subject: string;
  details: string;
  priority: "low" | "medium" | "high" | "critical";
  email?: string | null;
  pageUrl?: string;
  timestamp?: string;
}

export default function FeedbackEmailTemplate({
  category = "bug",
  subject = "Cannot sync extension attempts",
  details = "When attempting to sync code challenges completed on LeetCode, the sync spinner spins infinitely without logging an attempt details row.",
  priority = "high",
  email = "user@example.com",
  pageUrl = "https://deepfocus.site/workspace",
  timestamp = new Date().toISOString(),
}: FeedbackEmailProps) {
  const categoryLabels = {
    bug: { label: "Bug Report", bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444", border: "rgba(239, 68, 68, 0.2)" },
    feature: { label: "Feature Request", bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6", border: "rgba(59, 130, 246, 0.2)" },
    improvement: { label: "Improvement Suggestion", bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B", border: "rgba(245, 158, 11, 0.2)" },
    general: { label: "General Feedback", bg: "rgba(139, 92, 246, 0.1)", text: "#8B5CF6", border: "rgba(139, 92, 246, 0.2)" },
  };
  const cat = categoryLabels[category] || categoryLabels.general;

  const priorityLabels = {
    low: { label: "Low Priority", bg: "rgba(16, 185, 129, 0.1)", text: "#10B981", border: "rgba(16, 185, 129, 0.2)" },
    medium: { label: "Medium Priority", bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B", border: "rgba(245, 158, 11, 0.2)" },
    high: { label: "High Priority", bg: "rgba(249, 115, 22, 0.1)", text: "#F97316", border: "rgba(249, 115, 22, 0.2)" },
    critical: { label: "Critical Blocker", bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444", border: "rgba(239, 68, 68, 0.2)" },
  };
  const prio = priorityLabels[priority] || priorityLabels.medium;

  return (
    <Html lang="en">
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Top AI themed gradient indicator */}
          <Section style={styles.topBar} />

          {/* Header section with brand mark */}
          <Section style={styles.header}>
            <Section style={styles.logoContainer}>
              <Text style={styles.logoText}>DF</Text>
            </Section>
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
    backgroundColor: "#0b0f19",
    margin: "0",
    padding: "0",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  container: {
    maxWidth: "580px",
    margin: "40px auto",
    backgroundColor: "#111827",
    border: "1px solid #1f2937",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)",
  },
  topBar: {
    background: "linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)",
    height: "5px",
    width: "100%",
  },
  header: {
    padding: "36px 32px 28px",
    textAlign: "center" as const,
    borderBottom: "1px solid #1f2937",
    background: "linear-gradient(180deg, rgba(139, 92, 246, 0.03) 0%, transparent 100%)",
  },
  logoContainer: {
    width: "46px",
    height: "46px",
    lineHeight: "46px",
    backgroundColor: "#09090b",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    margin: "0 auto 18px",
    boxShadow: "0 4px 16px rgba(139, 92, 246, 0.2)",
    textAlign: "center" as const,
  },
  logoText: {
    margin: "0",
    fontWeight: "800",
    fontSize: "18px",
    color: "#ffffff",
    lineHeight: "46px",
  },
  title: {
    margin: "0",
    fontSize: "22px",
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: "-0.025em",
    lineHeight: "1.25",
  },
  subtitle: {
    margin: "6px 0 0",
    fontSize: "13px",
    color: "#9ca3af",
    fontWeight: "500",
  },
  content: {
    padding: "32px",
  },
  badgesBox: {
    padding: "14px",
    backgroundColor: "#131924",
    borderRadius: "12px",
    border: "1px solid #1f2937",
    marginBottom: "24px",
  },
  badgeLabel: {
    margin: "0 0 6px",
    fontSize: "10px",
    fontWeight: "700",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "#6b7280",
  },
  badge: {
    display: "inline-block",
    padding: "4px 10px",
    fontSize: "10px",
    fontWeight: "700",
    borderRadius: "6px",
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
    color: "#6b7280",
  },
  subjectText: {
    margin: "0",
    fontSize: "15px",
    color: "#ffffff",
    fontWeight: "600",
    lineHeight: "1.4",
  },
  quoteCard: {
    backgroundColor: "#0a0e17",
    borderLeft: "3px solid #8b5cf6",
    borderRadius: "0 12px 12px 0",
    padding: "20px 24px",
    borderTop: "1px solid #1e293b",
    borderRight: "1px solid #1e293b",
    borderBottom: "1px solid #1e293b",
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.4)",
  },
  messageText: {
    margin: "0",
    fontSize: "15px",
    lineHeight: "1.7",
    color: "#e5e7eb",
    fontWeight: "400",
    whiteSpace: "pre-wrap" as const,
  },
  contextCard: {
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #1f2937",
    backgroundColor: "#131924",
  },
  contextHeader: {
    margin: "0 0 12px",
    fontSize: "10px",
    fontWeight: "700",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "#6b7280",
  },
  contextRow: {
    fontSize: "13px",
    borderBottom: "1px solid #1f2937",
    paddingBottom: "8px",
    marginBottom: "8px",
  },
  contextRowLast: {
    fontSize: "13px",
    paddingBottom: "0",
    marginBottom: "0",
  },
  contextLabel: {
    color: "#9ca3af",
    fontWeight: "500",
  },
  contextValue: {
    textAlign: "right" as const,
    color: "#ffffff",
    fontWeight: "600",
  },
  link: {
    color: "#3b82f6",
    textDecoration: "none",
    fontWeight: "600",
  },
  anonymous: {
    color: "#4b5563",
    fontStyle: "italic",
  },
  footer: {
    padding: "24px",
    backgroundColor: "#09090b",
    textAlign: "center" as const,
    borderTop: "1px solid #1f2937",
  },
  footerBranding: {
    margin: "0",
    fontSize: "10px",
    fontWeight: "700",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "#4b5563",
  },
  footerTagline: {
    margin: "3px 0 0",
    fontSize: "11px",
    color: "#9ca3af",
    fontWeight: "500",
    fontStyle: "italic",
  },
};
