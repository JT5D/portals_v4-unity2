import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme/theme';

export const TermsOfServiceScreen = () => {
    const navigation = useNavigation();

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Terms of Conditions</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Terms & Conditions</Text>
                <Text style={styles.subtitle}>Last Updated January 2026</Text>

                <Text style={styles.sectionTitle}>H3M / PORTALS</Text>
                <Text style={styles.paragraph}>
                    These Terms & Conditions ("Terms") govern all use of the H3M Inc. website, the Portals platform, and any associated services including crypto interactions and staking. By accessing the website or using Portals, you agree to be bound by these Terms.
                </Text>
                <Text style={styles.paragraph}>
                    If you do not agree, do not use the website, Portals, or related services.
                </Text>

                <Text style={styles.sectionHeader}>SECTION 1. PLATFORM OVERVIEW</Text>
                <Text style={styles.paragraph}>
                    H3M ("we," "our," "us") provides tools that enable users to create, explore, share, and monetize immersive augmented reality experiences ("Portals"), including optional token staking features. Access to certain features may require account creation or wallet connection.
                </Text>

                <Text style={styles.sectionHeader}>SECTION 2. USER ACCOUNTS</Text>
                <Text style={styles.paragraph}>
                    Users must provide accurate and complete information.
                </Text>
                <Text style={styles.paragraph}>
                    You are responsible for maintaining confidentiality of account access credentials.
                </Text>
                <Text style={styles.paragraph}>
                    We reserve the right to suspend or terminate accounts that violate these Terms.
                </Text>

                <Text style={styles.sectionHeader}>SECTION 3. WALLET CONNECTION & CRYPTO FEATURES</Text>
                <Text style={styles.subHeader}>A. Wallet Ownership</Text>
                <Text style={styles.paragraph}>
                    You acknowledge and agree:
                    {'\n'}• You own and control the wallet you connect
                    {'\n'}• You are solely responsible for the security of your wallet
                    {'\n'}• We do not store private keys
                    {'\n'}• We do not custody funds
                    {'\n'}• All crypto transactions are final
                </Text>

                <Text style={styles.subHeader}>B. Staking</Text>
                <Text style={styles.paragraph}>
                    Staking is optional and voluntary
                    {'\n'}• Rewards, schedules, lock periods, and related rules may change
                    {'\n'}• We reserve the right to modify parameters at any time
                    {'\n'}• On-chain events govern final balances
                </Text>

                <Text style={styles.subHeader}>C. Risks</Text>
                <Text style={styles.paragraph}>
                    Crypto assets carry inherent financial risk.
                    {'\n'}Participation is at your own discretion and responsibility.
                </Text>

                <Text style={styles.subHeader}>D. Swap Components</Text>
                <Text style={styles.paragraph}>
                    When using swap interfaces:
                    {'\n'}• Swaps are executed via third-party liquidity pools or smart contracts
                    {'\n'}• You acknowledge risks of slippage, price impact, and front-running
                    {'\n'}• We do not guarantee execution prices or liquidity depth
                    {'\n'}• Interfaces are provided "as-is" without warranty
                </Text>

                <Text style={styles.subHeader}>E. XP System</Text>
                <Text style={styles.paragraph}>
                    XP (Experience Points) are non-monetary digital units with no cash value
                    {'\n'}• XP cannot be purchased, sold, or transferred for value
                    {'\n'}• We reserve the right to revoke, reset, or adjust XP balances for suspected abuse, botting, or exploiting
                    {'\n'}• XP is solely for platform utility, status tracking, and gamification
                </Text>

                <Text style={styles.sectionHeader}>SECTION 4. PLATFORM CONTENT & USER CONTENT</Text>
                <Text style={styles.paragraph}>
                    You retain ownership of content you create, upload, or publish through Portals.
                </Text>
                <Text style={styles.paragraph}>
                    By submitting content to Portals, you grant us a limited, worldwide, non-exclusive license to:
                    {'\n'}• host the content
                    {'\n'}• display the content within Portals
                    {'\n'}• show it to other users based on your sharing settings
                </Text>
                <Text style={styles.paragraph}>
                    You may revoke sharing visibility settings at any time, except where content has already been viewed, shared, or indexed publicly.
                </Text>
                <Text style={styles.paragraph}>
                    We do not claim ownership over your creative work.
                </Text>

                <Text style={styles.sectionHeader}>SECTION 5. PROHIBITED CONDUCT</Text>
                <Text style={styles.paragraph}>
                    Users may not:
                    {'\n'}• violate intellectual property rights
                    {'\n'}• upload malicious code, exploits, or scripts
                    {'\n'}• attempt to breach platform security
                    {'\n'}• interfere with network integrity
                    {'\n'}• engage in deceptive or fraudulent activity
                    {'\n'}• use the platform for illegal purposes
                    {'\n'}• impersonate others
                </Text>
                <Text style={styles.paragraph}>
                    We may suspend or ban users who violate this section.
                </Text>

                <Text style={styles.sectionHeader}>SECTION 6. COPYRIGHT & IP RIGHTS</Text>
                <Text style={styles.paragraph}>
                    Portals, website content, branding, logos, software, UI, feature sets, and platform architecture remain our exclusive intellectual property.
                </Text>
                <Text style={styles.paragraph}>
                    Unauthorized reproduction or redistribution is prohibited.
                </Text>

                <Text style={styles.sectionHeader}>SECTION 7. IMMERSIVE FEATURES & LOCATION DATA</Text>
                <Text style={styles.paragraph}>
                    Some features require access to:
                    {'\n'}• camera
                    {'\n'}• spatial sensors
                    {'\n'}• microphone
                    {'\n'}• location-based positioning
                </Text>
                <Text style={styles.paragraph}>
                    You can revoke permissions at any time in your device settings, but certain features may cease to function.
                </Text>

                <Text style={styles.sectionHeader}>SECTION 8. THIRD-PARTY SERVICES</Text>
                <Text style={styles.paragraph}>
                    We may integrate with:
                    {'\n'}• analytics tools
                    {'\n'}• cloud computing systems
                    {'\n'}• blockchain networks
                    {'\n'}• payment processors
                </Text>
                <Text style={styles.paragraph}>
                    We are not responsible for actions of external platforms.
                </Text>
                <Text style={styles.paragraph}>
                    Use of these services may be subject to separate terms.
                </Text>

                <Text style={styles.sectionHeader}>SECTION 9. DISCLAIMERS</Text>
                <Text style={styles.paragraph}>
                    The platform is provided "as is" and "as available."
                </Text>
                <Text style={styles.paragraph}>
                    We do not guarantee:
                    {'\n'}• uninterrupted service
                    {'\n'}• error-free performance
                    {'\n'}• accurate rewards projections
                    {'\n'}• continuous access to blockchains, APIs, or indexers
                </Text>
                <Text style={styles.paragraph}>
                    Specific Risk Disclaimers:
                    {'\n'}• Impermanent Loss: Liquidity provision and staking may result in impermanent loss compared to holding tokens.
                    {'\n'}• Smart Contract Risk: Code vulnerabilities could lead to loss of funds. While we audit contracts, no code is risk-free.
                    {'\n'}• Regulatory Risk: Changes in laws may impact feature availability.
                </Text>
                <Text style={styles.paragraph}>
                    Use is at your own risk.
                </Text>

                <Text style={styles.sectionHeader}>SECTION 10. LIMITATION OF LIABILITY</Text>
                <Text style={styles.paragraph}>
                    To the fullest extent permitted by law, H3M is not liable for:
                    {'\n'}• indirect or consequential damages
                    {'\n'}• loss of revenue, data, or assets
                    {'\n'}• wallet compromise
                    {'\n'}• user operational mistakes
                    {'\n'}• smart contract vulnerabilities
                    {'\n'}• blockchain congestion
                    {'\n'}• failed transactions
                </Text>

                <Text style={styles.sectionHeader}>SECTION 11. MODIFICATION OF TERMS</Text>
                <Text style={styles.paragraph}>
                    We may update these Terms periodically.
                </Text>
                <Text style={styles.paragraph}>
                    Continued use of the platform after changes constitutes acceptance.
                </Text>

                <Text style={styles.sectionHeader}>SECTION 12. TERMINATION</Text>
                <Text style={styles.paragraph}>
                    We reserve the right to restrict or terminate access for any breach of Terms.
                </Text>
                <Text style={styles.paragraph}>
                    Users may delete accounts or disconnect wallets at any time.
                </Text>

                <Text style={styles.sectionHeader}>SECTION 13. GOVERNING LAW</Text>
                <Text style={styles.paragraph}>
                    These Terms are governed by the laws of the State of California, USA, unless otherwise required by local law.
                </Text>

                <Text style={styles.sectionHeader}>SECTION 14. CONTACT</Text>
                <Text style={styles.paragraph}>
                    contact@h3m.ai
                    {'\n'}H3M Inc.
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
});
