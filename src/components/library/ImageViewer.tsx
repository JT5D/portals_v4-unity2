import React from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';

interface ImageViewerProps {
    uri: string;
    style?: any;
    resizeMode?: 'contain' | 'cover';
}

export const ImageViewer = ({ uri, style, resizeMode = 'contain' }: ImageViewerProps) => {
    return (
        <View style={[styles.container, style]}>
            <Image
                source={{ uri }}
                style={styles.image}
                resizeMode={resizeMode}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    image: {
        width: '100%',
        height: '100%',
    },
});
