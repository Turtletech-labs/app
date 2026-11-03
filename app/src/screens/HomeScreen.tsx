import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus } from 'lucide-react-native';
import { api } from '../lib/api';
import { TERMS_VERSION } from '../config';
import type { Circle, Post, PostType } from '../lib/types';
import { useApp } from '../state/AppState';
import { colors, radius, space, type } from '../theme';
import { Banner, Button, Chip, Empty, Loading, Screen } from '../components/ui';
import { PostCard, TYPE_META } from '../components/PostCard';
import type { RootStackParamList } from '../navigation';

const FILTERS: (PostType | 'all')[] = ['all', 'notice', 'question', 'job', 'event'];

export function HomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useApp();
  const [filter, setFilter] = useState<PostType | 'all'>('all');
  const [circle, setCircle] = useState<string | 'all'>('all');
  const [circles, setCircles] = useState<Circle[]>([]);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const mine = await api.listMyCircles();
    setCircles(mine);
    const ids = circle === 'all' ? mine.map((c) => c.id) : [circle];
    setPosts(await api.listPosts({ circleIds: ids, type: filter === 'all' ? undefined : filter }));
  }, [filter, circle]);

  useFocusEffect(useCallback(() => { load().catch(() => setPosts([])); }, [load]));

  const refresh = async () => {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refresh}>
        <Text style={type.small}>Hi {profile?.displayName.split(' ')[0]}. Here's what's new in your circles.</Text>
        {profile && profile.termsVersion !== TERMS_VERSION ? (
          <View style={{ gap: space.sm }}>
            <Banner tone="info" title="Please review the community rules">
              We have written down what is allowed on Sangam and how we handle your data. Please read and accept them.
            </Banner>
            <Button title="Review and accept" onPress={() => nav.navigate('Rules')} />
          </View>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {FILTERS.map((f) => (
            <Chip key={f} label={f === 'all' ? 'Everything' : TYPE_META[f].plural} selected={filter === f} onPress={() => setFilter(f)} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          <Chip label="All my circles" selected={circle === 'all'} onPress={() => setCircle('all')} />
          {circles.map((c) => <Chip key={c.id} label={c.name} selected={circle === c.id} onPress={() => setCircle(c.id)} />)}
          <Chip label="+ Join circles" onPress={() => nav.navigate('Circles')} />
        </ScrollView>
        {posts === null ? <Loading /> : posts.length === 0 ? (
          <Empty title="Nothing here yet" body="Join more circles, or be the first to post something useful." />
        ) : (
          posts.map((p) => <PostCard key={p.id} post={p} onPress={() => nav.navigate('Post', { id: p.id })} />)
        )}
        <View style={{ height: 72 }} />
      </Screen>
      <Pressable
        onPress={() => nav.navigate('Compose', filter === 'all' ? undefined : { type: filter })}
        accessibilityRole="button"
        accessibilityLabel="New post"
        style={({ pressed }) => ({
          position: 'absolute', right: space.lg, bottom: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.xs,
          backgroundColor: colors.teal, paddingHorizontal: space.lg, height: 52, borderRadius: radius.pill, opacity: pressed ? 0.85 : 1,
          shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
        })}
      >
        <Plus color={colors.white} size={20} />
        <Text style={{ color: colors.white, fontWeight: '700', fontSize: 16 }}>Post</Text>
      </Pressable>
    </View>
  );
}
