import ScreenHeader from "@/components/ScreenHeader";
import { paymentService, type Transaction } from "@/features/payment/service";
import { Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function TransactionRow({ item }: { item: Transaction }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Feather name="arrow-down-left" size={16} color="#15803D" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.serviceTitle}
        </Text>
        <Text style={styles.rowSub}>
          {item.clientName} • {formatDate(item.createdAt)}
        </Text>
      </View>
      <Text style={styles.rowAmount}>+₹{item.amount}</Text>
    </View>
  );
}

export default function AstrologerTransactionsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const data = await paymentService.getMyTransactions();
      setTransactions(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Transactions load nahi hui");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const totalEarned = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader title="Transactions" subtitle="Tumhari kamai ka poora record" />

      {/* Total earnings card */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Earned</Text>
        <Text style={styles.totalValue}>₹{totalEarned.toLocaleString("en-IN")}</Text>
        <Text style={styles.totalSub}>{transactions.length} successful payments</Text>
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color="#9d0399" size="large" />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchTransactions(true)}
              tintColor="#9d0399"
            />
          }
        >
          {transactions.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="credit-card" size={28} color="#D1D5DB" />
              <Text style={styles.emptyText}>Abhi tak koi payment nahi mila</Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {transactions.map((t, i) => (
                <View key={t.id}>
                  <TransactionRow item={t} />
                  {i < transactions.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16 },

  totalCard: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: "#0b1d5b",
    borderRadius: 16,
    padding: 20,
  },
  totalLabel: { color: "#C4B5FD", fontSize: 12, fontWeight: "600" },
  totalValue: { color: "#FFF", fontSize: 32, fontWeight: "800", marginTop: 4 },
  totalSub: { color: "#C4B5FD", fontSize: 11, marginTop: 6 },

  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 13, color: "#9CA3AF" },

  listCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 13.5, fontWeight: "700", color: "#1A1A2E" },
  rowSub: { fontSize: 11.5, color: "#6B7280", marginTop: 2 },
  rowAmount: { fontSize: 14, fontWeight: "800", color: "#15803D" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginLeft: 62 },
});
