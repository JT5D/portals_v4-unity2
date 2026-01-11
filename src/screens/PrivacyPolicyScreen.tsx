import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme/theme';

export const PrivacyPolicyScreen = () => {
    const navigation = useNavigation();

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Privacy Policy</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Privacy Policy</Text>
                <Text style={styles.subtitle}>Last Updated November 2024</Text>

                <Text style={styles.sectionTitle}>PRIVACY POLICY – H3M / PORTALS – GENERAL SITE, CRYPTO & STAKING</Text>

                <Text style={styles.paragraph}>
                    This Privacy Policy describes how H3M Inc. ("H3M," "we," "our," "us") collects, uses, shares, and protects personal information when visitors access our website, interact with Portals, or engage in crypto-related features such as wallet connection, token interactions, and staking.
                </Text>
                <Text style={styles.paragraph}>
                    By using our website or accessing any associated services, you consent to this Policy.
                </Text>

                <Text style={styles.sectionHeader}>SECTION 1. INFORMATION WE COLLECT</Text>
                <Text style={styles.subHeader}>A. Information You Provide</Text>
                <Text style={styles.paragraph}>
                    • Account details (name, username, email)
                    {'\n'}• Contact information
                    {'\n'}• Support inquiries or submissions
                    {'\n'}• Wallet information you voluntarily connect
                </Text>

                <Text style={styles.subHeader}>B. Automatically Collected Information</Text>
                <Text style={styles.paragraph}>
                    • Device data
                    {'\n'}• Browser & OS version
                    {'\n'}• IP address
                    {'\n'}• Usage analytics
                    {'\n'}• Interaction events with our platform
                </Text>

                <Text style={styles.subHeader}>C. Blockchain Data</Text>
                <Text style={styles.paragraph}>
                    • Public wallet address
                    {'\n'}• Public transaction history
                    {'\n'}• Staking activity
                    {'\n'}• Token balance (when relevant to the service)
                </Text>
                <Text style={styles.paragraph}>
                    Note: Blockchain data recorded on public ledgers is inherently public, immutable, and may be accessible to others.
                </Text>

                <Text style={styles.sectionHeader}>SECTION 2. HOW WE USE INFORMATION</Text>
                <Text style={styles.paragraph}>
                    We use collected data to:
                    {'\n'}• Operate and maintain the H3M website and Portals
                    {'\n'}• Enable creation, distribution, and monetization of Portals content
                    {'\n'}• Support wallet authentication and staking processes
                    {'\n'}• Monitor and secure platform performance
                    {'\n'}• Improve user experience and product design
                    {'\n'}• Communicate service updates, announcements, and platform changes
                    {'\n'}• Comply with applicable laws and regulatory requirements
                </Text>
                <Text style={styles.paragraph}>
                    We NEVER sell user data.
                </Text>

                <Text style={styles.sectionHeader}>SECTION 3. STAKING, SWAP & DEFI DATA HANDLING</Text>
                <Text style={styles.paragraph}>
                    When you stake tokens or use swap features:
                    {'\n'}• Your wallet address is recorded for staking eligibility and transaction verification
                    {'\n'}• We track reward accrual, lock periods, and redemption status
                    {'\n'}• Swap transaction data (including slippage settings, input/output amounts, and transaction hashes) is processed to facilitate on-chain execution
                    {'\n'}• Calculations may involve referencing on-chain data from third-party liquidity pools
                    {'\n'}• We may store staking and swap snapshots off-chain for accuracy, analytics, and fraud prevention
                    {'\n'}• Staking is voluntary and reversible (subject to lock rules)
                </Text>
                <Text style={styles.paragraph}>
                    We do NOT request or store private keys.
                    {'\n'}We do NOT custody user funds.
                </Text>

                <Text style={styles.sectionHeader}>SECTION 3.1. XP & REWARDS DATA</Text>
                <Text style={styles.paragraph}>
                    Regarding Experience Points (XP) and platform rewards:
                    {'\n'}• XP is an internal metric used to track user engagement and loyalty
                    {'\n'}• XP data is associated with your user profile and/or wallet address
                    {'\n'}• We reserve the right to audit XP balances to ensure fair play
                    {'\n'}• XP has no cash value and is not a financial instrument
                    {'\n'}• We may share aggregated XP leaderboards publicly
                </Text>

                <Text style={styles.sectionHeader}>SECTION 4. COOKIES & ANALYTICS</Text>
                <Text style={styles.paragraph}>
                    We use cookies and analytics tools to:
                    {'\n'}• Understand platform performance
                    {'\n'}• Identify usage trends
                    {'\n'}• Improve onboarding and creative tools
                    {'\n'}• Diagnose functionality issues
                </Text>
                <Text style={styles.paragraph}>
                    You may disable cookies in your browser settings.
                </Text>

                <Text style={styles.sectionHeader}>SECTION 5. THIRD-PARTY SERVICES</Text>
                <Text style={styles.paragraph}>
                    We may share certain information with trusted vendors solely for core operations, including:
                    {'\n'}• Cloud hosting providers
                    {'\n'}• Analytics platforms
                    {'\n'}• Blockchain indexers
                    {'\n'}• Payment processors
                    {'\n'}• Security tools
                    {'\n'}• Third parties have access only to the minimum required information.
                </Text>
                <Text style={styles.paragraph}>
                    We do not permit third parties to sell, lease, or market your information.
                </Text>

                <Text style={styles.sectionHeader}>SECTION 6. SECURITY</Text>
                <Text style={styles.paragraph}>
                    We use industry-standard measures to protect personal data, including:
                    {'\n'}• Encryption in transit
                    {'\n'}• Limited internal access
                    {'\n'}• Audit and monitoring
                    {'\n'}• Token-gated administrative systems
                </Text>
                <Text style={styles.paragraph}>
                    No system is perfectly secure; use caution when handling crypto assets.
                </Text>

                <Text style={styles.sectionHeader}>SECTION 7. CHILDREN'S PRIVACY</Text>
                <Text style={styles.paragraph}>
                    Our services are not intended for individuals under the age of 13 (or the age required by local law).
                </Text>
                <Text style={styles.paragraph}>
                    We do not knowingly collect information from minors.
                </Text>

                <Text style={styles.sectionHeader}>SECTION 8. USER CONTROL</Text>
                <Text style={styles.paragraph}>
                    You may:
                    {'\n'}• Request access or correction
                    {'\n'}• Request deletion
                    {'\n'}• Disconnect your wallet
                    {'\n'}• Request cessation of future communications
                </Text>
                <Text style={styles.paragraph}>
                    Blockchain data cannot be altered or deleted, as it is not controlled by us.
                </Text>

                <Text style={styles.sectionHeader}>SECTION 9. CHANGES TO THIS POLICY</Text>
                <Text style={styles.paragraph}>
                    We may update this Policy periodically.
                </Text>
                <Text style={styles.paragraph}>
                    Continued use indicates acceptance.
                </Text>

                <Text style={styles.sectionHeader}>SECTION 10. CONTACT</Text>
                <Text style={styles.paragraph}>
                    contact@h3m.ai
                    {'\n'}H3M Inc.
                </Text>

                <View style={styles.separator} />

                <Text style={styles.sectionTitle}>SEPARATE POLICY – PRIVACY POLICY FOR PORTALS PLATFORM USE</Text>
                <Text style={styles.subtitle}>Last updated: November 2024</Text>

                <Text style={styles.paragraph}>
                    This Privacy Policy applies specifically to the use of the Portals platform, including mobile access, AR features, creator tools, and interactive experiences.
                </Text>

                <Text style={styles.sectionHeader}>DATA WE COLLECT THROUGH PORTALS</Text>
                <Text style={styles.paragraph}>
                    We may collect:
                    {'\n'}• Account login data
                    {'\n'}• Public wallet address
                    {'\n'}• Creator profile data
                    {'\n'}• Uploaded assets, metadata, and creations
                    {'\n'}• Usage statistics related to immersive experiences
                    {'\n'}• Device orientation & spatial mapping signals (when enabled by user permissions)
                    {'\n'}• QR-scan events
                    {'\n'}• Interaction and event participation
                </Text>
                <Text style={styles.paragraph}>
                    We do NOT collect:
                    {'\n'}• Camera feeds beyond session-based spatial mapping
                    {'\n'}• Raw camera images without explicit content capture action
                    {'\n'}• Biometric identifiers
                </Text>

                <Text style={styles.sectionHeader}>WHY WE COLLECT IT</Text>
                <Text style={styles.paragraph}>
                    We collect this information to:
                    {'\n'}• Power immersive AR experiences
                    {'\n'}• Render spatial scenes correctly
                    {'\n'}• Detect device position & orientation
                    {'\n'}• Provide creator analytics and audience data
                    {'\n'}• Enable monetization systems
                    {'\n'}• Prevent fraud or abuse
                    {'\n'}• Improve product features
                </Text>

                <Text style={styles.sectionHeader}>SPATIAL DATA DISCLOSURE</Text>
                <Text style={styles.paragraph}>
                    Spatial mapping data may be processed temporarily to generate experiences but is not permanently stored unless explicitly required by the user to save a scene.
                </Text>

                <Text style={styles.sectionHeader}>CREATOR CONTENT RIGHTS</Text>
                <Text style={styles.paragraph}>
                    You retain ownership of the assets you upload, subject to relevant platform terms.
                </Text>
                <Text style={styles.paragraph}>
                    We do not sell your creative content.
                </Text>
                <Text style={styles.paragraph}>
                    We may display experiences publicly if you select public sharing.
                </Text>

                <Text style={styles.sectionHeader}>ANONYMIZATION</Text>
                <Text style={styles.paragraph}>
                    Certain analytics may be anonymized and aggregated prior to analysis.
                </Text>

                <Text style={styles.sectionHeader}>INTERNATIONAL USERS</Text>
                <Text style={styles.paragraph}>
                    Data may be processed or stored in multiple jurisdictions depending on infrastructure and partner systems.
                </Text>

                <Text style={styles.sectionHeader}>CONTACT</Text>
                <Text style={styles.paragraph}>
                    contact@h3m.ai
                </Text>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        backgroundColor: theme.colors.surfaceHighlight,
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    content: {
        padding: 24,
        paddingBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.textDim,
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginTop: 24,
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
        lineHeight: 26,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        marginTop: 24,
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    subHeader: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ddd',
        marginTop: 16,
        marginBottom: 8,
    },
    paragraph: {
        fontSize: 15,
        color: theme.colors.textDim,
        lineHeight: 24,
        marginBottom: 16,
    },
    separator: {
        height: 1,
        backgroundColor: '#333',
        marginVertical: 40,
        width: '100%',
    },
});
