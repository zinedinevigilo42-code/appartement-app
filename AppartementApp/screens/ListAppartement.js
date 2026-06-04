import React, { useEffect, useState, useRef } from "react";
import {
    View, Text, TextInput, TouchableOpacity,
    ActivityIndicator, ScrollView, Animated,
    StyleSheet, Dimensions
} from "react-native";
import { BarChart } from "react-native-chart-kit";
import api from "../services/api";

const SCREEN_WIDTH = Dimensions.get("window").width;

// ✅ Toast notification
function Toast({ message, type, visible }) {
    const opacity = useRef(new Animated.Value(0)).current
    const translateY = useRef(new Animated.Value(30)).current

    useEffect(() => {
        if (visible) {
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
                    Animated.timing(translateY, { toValue: 0, duration: 350, useNativeDriver: true }),
                ]),
                Animated.delay(4000),
                Animated.parallel([
                    Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
                    Animated.timing(translateY, { toValue: 30, duration: 400, useNativeDriver: true }),
                ]),
            ]).start()
        }
    }, [visible, message])

    const colors = {
        success: { bg: "#00b894", border: "#00cec9" },
        error:   { bg: "#d63031", border: "#ff7675" },
        warning: { bg: "#e17055", border: "#fdcb6e" },
    }
    const c = colors[type] || colors.success
    const icons = { success: "✅", error: "❌", warning: "⚠️" }

    return (
        <Animated.View style={[
            styles.toast,
            { backgroundColor: c.bg, borderLeftColor: c.border, opacity, transform: [{ translateY }] }
        ]} pointerEvents="none">
            <Text style={styles.toastIcon}>{icons[type] || "✅"}</Text>
            <Text style={styles.toastText}>{message}</Text>
        </Animated.View>
    )
}

// ✅ Modal confirmation suppression
function ConfirmModal({ visible, message, onConfirm, onCancel }) {
    const scale = useRef(new Animated.Value(0.8)).current
    const opacity = useRef(new Animated.Value(0)).current

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 100 }),
                Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]).start()
        } else {
            scale.setValue(0.8)
            opacity.setValue(0)
        }
    }, [visible])

    if (!visible) return null
    return (
        <Animated.View style={[styles.modalOverlay, { opacity }]}>
            <Animated.View style={[styles.modalBox, { transform: [{ scale }] }]}>
                <View style={styles.modalIconContainer}>
                    <Text style={styles.modalIcon}>🗑️</Text>
                </View>
                <Text style={styles.modalTitle}>Supprimer ?</Text>
                <Text style={styles.modalMessage}>{message}</Text>
                <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.modalBtnCancel} onPress={onCancel} activeOpacity={0.8}>
                        <Text style={styles.modalBtnCancelText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalBtnConfirm} onPress={onConfirm} activeOpacity={0.8}>
                        <Text style={styles.modalBtnText}>Supprimer</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </Animated.View>
    )
}

export default function ListAppartement() {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [numApp, setNumApp] = useState("")
    const [design, setDesign] = useState("")
    const [loyer, setLoyer] = useState("")
    const [adding, setAdding] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [toast, setToast] = useState({ visible: false, message: "", type: "success", key: 0 })
    const [confirmModal, setConfirmModal] = useState({ visible: false, id: null })
    const [activeTab, setActiveTab] = useState("liste") // "liste" | "graphe"

    const headerAnim = useRef(new Animated.Value(0)).current

    const showToast = (message, type = "success") => {
        setToast(prev => ({ visible: true, message, type, key: prev.key + 1 }))
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 5000)
    }

    const fetchData = async () => {
        try {
            setLoading(true)
            const response = await api.get("/appartements")
            const result = Array.isArray(response.data) ? response.data : []
            if (result.length > 0) console.log("✅ Champs MySQL :", Object.keys(result[0]))
            setData(result)
        } catch (error) {
            showToast("Impossible de charger les données", "error")
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchData()
        Animated.timing(headerAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start()
    }, [])

    // ============ LOGIQUE INCHANGÉE ============

    const handleSubmit = async () => {
        if (!numApp.trim()) { showToast("Le numéro d'appartement est requis", "warning"); return }
        if (!design.trim()) { showToast("La désignation est requise", "warning"); return }
        if (!loyer.trim()) { showToast("Le loyer est requis", "warning"); return }
        const loyerValue = parseFloat(loyer)
        if (isNaN(loyerValue) || loyerValue <= 0) { showToast("Le loyer doit être un nombre positif", "warning"); return }
        setAdding(true)
        try {
            if (editingId !== null) {
                await api.put(`/update/${editingId}`, { numApp: numApp.trim(), design: design.trim(), loyer: loyerValue })
                showToast("Appartement modifié avec succès !", "success")
                setEditingId(null)
            } else {
                await api.post("/add", { numApp: numApp.trim(), design: design.trim(), loyer: loyerValue })
                showToast("Appartement ajouté avec succès !", "success")
            }
            setNumApp(""); setDesign(""); setLoyer("")
            await fetchData()
        } catch (error) {
            showToast(error.response?.data?.error || "Opération échouée", "error")
        } finally {
            setAdding(false)
        }
    }

    const handleEdit = (item) => {
        const itemId = item.id ?? item.ID ?? item.idAppartement ?? item.Id
        if (!itemId) { showToast("Impossible d'identifier cet appartement", "error"); return }
        setEditingId(itemId)
        setNumApp((item.numApp ?? item.numapp ?? "").toString())
        setDesign(item.design ?? "")
        setLoyer((item.loyer ?? "").toString())
    }

    const handleDelete = (id) => {
        if (!id && id !== 0) { showToast("ID invalide, impossible de supprimer", "error"); return }
        setConfirmModal({ visible: true, id })
    }

    const confirmDelete = async () => {
        const id = confirmModal.id
        setConfirmModal({ visible: false, id: null })
        try {
            await api.delete(`/delete/${id}`)
            showToast("Appartement supprimé avec succès !", "success")
            await fetchData()
        } catch (error) {
            showToast(error.response?.data?.error || "Échec de la suppression", "error")
        }
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        setNumApp(""); setDesign(""); setLoyer("")
    }

    // ============ AFFICHAGE ============

    const getObs = (loyer) => {
        if (loyer < 1000) return { text: "Bas", color: "#00b894", bg: "#d4f5ee" }
        if (loyer <= 5000) return { text: "Moyen", color: "#e17055", bg: "#fdecea" }
        return { text: "Élevé", color: "#d63031", bg: "#fce4e4" }
    }

    const total = data.reduce((sum, a) => sum + parseFloat(a.loyer || 0), 0)
    const minVal = data.length ? Math.min(...data.map(a => parseFloat(a.loyer || 0))) : 0
    const maxVal = data.length ? Math.max(...data.map(a => parseFloat(a.loyer || 0))) : 0

    // Données histogramme
    const chartData = {
        labels: ["Total", "Minimum", "Maximum"],
        datasets: [{
            data: [
                total > 0 ? total : 0,
                minVal > 0 ? minVal : 0,
                maxVal > 0 ? maxVal : 0,
            ]
        }]
    }

    const renderItem = ({ item, index }) => {
        const obs = getObs(item.loyer)
        const itemId = item.id ?? item.ID ?? item.idAppartement ?? item.Id
        return (
            <View style={[styles.tableRow, index % 2 === 0 && styles.rowEven]}>
                <Text style={[styles.cell, { flex: 0.7 }]}>{item.numApp ?? item.numapp}</Text>
                <Text style={[styles.cell, { flex: 2 }]} numberOfLines={1}>{item.design}</Text>
                <Text style={[styles.cell, styles.loyerCell, { flex: 1.4 }]}>
                    {parseFloat(item.loyer).toLocaleString()} Ar
                </Text>
                <View style={[styles.obsBadge, { backgroundColor: obs.bg, flex: 1.1 }]}>
                    <Text style={[styles.obsText, { color: obs.color }]}>{obs.text}</Text>
                </View>
                <View style={[styles.actionButtons, { flex: 0.8 }]}>
                    <TouchableOpacity style={styles.btnEditIcon} onPress={() => handleEdit(item)} activeOpacity={0.7}>
                        <Text style={{ fontSize: 15 }}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnDeleteIcon} onPress={() => handleDelete(itemId)} activeOpacity={0.7}>
                        <Text style={{ fontSize: 15 }}>🗑️</Text>
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    return (
        <View style={{ flex: 1, backgroundColor: "#f0f3f8" }}>
            <ScrollView showsVerticalScrollIndicator={false}>

                {/* ===== HEADER ===== */}
                <Animated.View style={[styles.header, {
                    opacity: headerAnim,
                    transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }]
                }]}>
                    <Text style={styles.headerTitle}>🏠 Appartements</Text>
                    <Text style={styles.headerSub}>{data.length} enregistrement{data.length > 1 ? "s" : ""}</Text>
                </Animated.View>

                {/* ===== FORMULAIRE ===== */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardHeaderIcon}>{editingId ? "✏️" : "➕"}</Text>
                        <Text style={styles.cardHeaderTitle}>
                            {editingId ? "Modifier l'appartement" : "Nouvel appartement"}
                        </Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Numéro</Text>
                        <TextInput style={styles.input} placeholder="Ex: 101"
                            placeholderTextColor="#aab" value={numApp}
                            onChangeText={setNumApp} keyboardType="numeric" editable={!adding} />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Désignation</Text>
                        <TextInput style={styles.input} placeholder="Ex: Studio centre-ville"
                            placeholderTextColor="#aab" value={design}
                            onChangeText={setDesign} editable={!adding} />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Loyer (Ar)</Text>
                        <TextInput style={styles.input} placeholder="Ex: 3500"
                            placeholderTextColor="#aab" value={loyer}
                            onChangeText={setLoyer} keyboardType="numeric" editable={!adding} />
                    </View>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[styles.btnPrimary, adding && styles.btnDisabled,
                                { backgroundColor: editingId ? "#e17055" : "#6c5ce7" }]}
                            onPress={handleSubmit} disabled={adding} activeOpacity={0.85}>
                            {adding
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={styles.btnText}>{editingId ? "💾 Mettre à jour" : "➕ Ajouter"}</Text>
                            }
                        </TouchableOpacity>
                        {editingId && (
                            <TouchableOpacity style={styles.btnSecondary}
                                onPress={handleCancelEdit} disabled={adding} activeOpacity={0.85}>
                                <Text style={styles.btnSecondaryText}>✕ Annuler</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* ===== TABS ===== */}
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === "liste" && styles.tabActive]}
                        onPress={() => setActiveTab("liste")} activeOpacity={0.8}>
                        <Text style={[styles.tabText, activeTab === "liste" && styles.tabTextActive]}>
                            📋 Liste
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === "graphe" && styles.tabActive]}
                        onPress={() => setActiveTab("graphe")} activeOpacity={0.8}>
                        <Text style={[styles.tabText, activeTab === "graphe" && styles.tabTextActive]}>
                            📊 Graphique
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* ===== LISTE ===== */}
                {activeTab === "liste" && (
                    <View style={styles.card}>
                        {/* En-tête tableau */}
                        <View style={styles.tableHeader}>
                            <Text style={[styles.headerCell, { flex: 0.7 }]}>N°</Text>
                            <Text style={[styles.headerCell, { flex: 2 }]}>Désignation</Text>
                            <Text style={[styles.headerCell, { flex: 1.4 }]}>Loyer</Text>
                            <Text style={[styles.headerCell, { flex: 1.1 }]}>Obs.</Text>
                            <Text style={[styles.headerCell, { flex: 0.8 }]}>Act.</Text>
                        </View>

                        {loading && !refreshing ? (
                            <ActivityIndicator size="large" color="#6c5ce7" style={{ marginVertical: 30 }} />
                        ) : data.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyEmoji}>🏚️</Text>
                                <Text style={styles.emptyText}>Aucun appartement enregistré</Text>
                            </View>
                        ) : (
                            data.map((item, index) => renderItem({ item, index }))
                        )}

                        {/* ===== STATS en bas du tableau ===== */}
                        {data.length > 0 && (
                            <View style={styles.statsRow}>
                                <View style={[styles.statCard, { borderTopColor: "#6c5ce7" }]}>
                                    <Text style={styles.statLabel}>💰 Total</Text>
                                    <Text style={[styles.statValue, { color: "#6c5ce7" }]}>
                                        {total.toLocaleString()} Ar
                                    </Text>
                                </View>
                                <View style={[styles.statCard, { borderTopColor: "#00b894" }]}>
                                    <Text style={styles.statLabel}>📉 Min</Text>
                                    <Text style={[styles.statValue, { color: "#00b894" }]}>
                                        {minVal.toLocaleString()} Ar
                                    </Text>
                                </View>
                                <View style={[styles.statCard, { borderTopColor: "#d63031" }]}>
                                    <Text style={styles.statLabel}>📈 Max</Text>
                                    <Text style={[styles.statValue, { color: "#d63031" }]}>
                                        {maxVal.toLocaleString()} Ar
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* ===== GRAPHIQUE ===== */}
                {activeTab === "graphe" && (
                    <View style={styles.card}>
                        <Text style={styles.chartTitle}>📊 Histogramme des loyers</Text>
                        <Text style={styles.chartSub}>Total, Minimum et Maximum (en Ar)</Text>

                        {data.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyEmoji}>📊</Text>
                                <Text style={styles.emptyText}>Aucune donnée à afficher</Text>
                            </View>
                        ) : (
                            <>
                                <BarChart
                                    data={chartData}
                                    width={SCREEN_WIDTH - 64}
                                    height={260}
                                    fromZero
                                    showValuesOnTopOfBars
                                    withInnerLines={true}
                                    segments={4}
                                    chartConfig={{
                                        backgroundColor: "#fff",
                                        backgroundGradientFrom: "#fff",
                                        backgroundGradientTo: "#fff",
                                        decimalPlaces: 0,
                                        color: (opacity = 1, index) => {
                                            const colors = [
                                                `rgba(108, 92, 231, ${opacity})`,
                                                `rgba(0, 184, 148, ${opacity})`,
                                                `rgba(214, 48, 49, ${opacity})`,
                                            ]
                                            return colors[index % 3] || `rgba(108, 92, 231, ${opacity})`
                                        },
                                        labelColor: () => "#636e72",
                                        style: { borderRadius: 12 },
                                        propsForBackgroundLines: {
                                            strokeDasharray: "4",
                                            stroke: "#dfe6e9",
                                            strokeWidth: 1,
                                        },
                                        propsForLabels: { fontSize: 13, fontWeight: "bold" },
                                    }}
                                    style={{ borderRadius: 12, marginTop: 12 }}
                                    verticalLabelRotation={0}
                                    yAxisSuffix=" Ar"
                                    yAxisInterval={1}
                                />

                                {/* Légende */}
                                <View style={styles.legendRow}>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: "#6c5ce7" }]} />
                                        <Text style={styles.legendText}>Total : {total.toLocaleString()} Ar</Text>
                                    </View>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: "#00b894" }]} />
                                        <Text style={styles.legendText}>Min : {minVal.toLocaleString()} Ar</Text>
                                    </View>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: "#d63031" }]} />
                                        <Text style={styles.legendText}>Max : {maxVal.toLocaleString()} Ar</Text>
                                    </View>
                                </View>
                            </>
                        )}
                    </View>
                )}

                <View style={{ height: 60 }} />
            </ScrollView>

            <ConfirmModal
                visible={confirmModal.visible}
                message="Cette action est irréversible. Confirmer la suppression ?"
                onConfirm={confirmDelete}
                onCancel={() => setConfirmModal({ visible: false, id: null })}
            />

            <Toast key={toast.key} message={toast.message} type={toast.type} visible={toast.visible} />
        </View>
    )
}

const styles = StyleSheet.create({
    // Header
    header: {
        paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16,
        backgroundColor: "#6c5ce7", marginBottom: 0,
    },
    headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff" },
    headerSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2 },

    // Card
    card: {
        backgroundColor: "#fff", borderRadius: 16, marginHorizontal: 14,
        marginTop: 14, padding: 16, elevation: 3,
        shadowColor: "#6c5ce7", shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08, shadowRadius: 8,
    },
    cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
    cardHeaderIcon: { fontSize: 20, marginRight: 8 },
    cardHeaderTitle: { fontSize: 16, fontWeight: "bold", color: "#2d3436" },

    // Inputs
    inputGroup: { marginBottom: 12 },
    inputLabel: { fontSize: 12, fontWeight: "600", color: "#636e72", marginBottom: 4, marginLeft: 2 },
    input: {
        borderWidth: 1.5, borderColor: "#dfe6e9", borderRadius: 10,
        padding: 12, fontSize: 15, backgroundColor: "#f8f9fe", color: "#2d3436",
    },

    // Boutons formulaire
    buttonRow: { flexDirection: "row", gap: 10, marginTop: 6 },
    btnPrimary: {
        flex: 1, padding: 14, borderRadius: 10,
        alignItems: "center", justifyContent: "center",
    },
    btnSecondary: {
        paddingHorizontal: 16, paddingVertical: 14, borderRadius: 10,
        alignItems: "center", borderWidth: 1.5, borderColor: "#dfe6e9",
    },
    btnDisabled: { opacity: 0.5 },
    btnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
    btnSecondaryText: { color: "#636e72", fontWeight: "600", fontSize: 14 },

    // Tabs
    tabBar: {
        flexDirection: "row", marginHorizontal: 14, marginTop: 14,
        backgroundColor: "#fff", borderRadius: 12, padding: 4,
        elevation: 2, shadowColor: "#000", shadowOpacity: 0.05,
    },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
    tabActive: { backgroundColor: "#6c5ce7" },
    tabText: { fontSize: 14, fontWeight: "600", color: "#636e72" },
    tabTextActive: { color: "#fff" },

    // Tableau
    tableHeader: {
        flexDirection: "row", backgroundColor: "#f0eeff",
        borderRadius: 8, paddingVertical: 10, paddingHorizontal: 6, marginBottom: 4,
    },
    headerCell: { color: "#6c5ce7", fontWeight: "bold", fontSize: 12, textAlign: "center" },
    tableRow: {
        flexDirection: "row", paddingVertical: 11, paddingHorizontal: 6,
        alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#f0f3f8",
    },
    rowEven: { backgroundColor: "#fafbff" },
    cell: { fontSize: 13, color: "#2d3436", textAlign: "center" },
    loyerCell: { color: "#6c5ce7", fontWeight: "700" },
    obsBadge: {
        borderRadius: 20, paddingVertical: 3, paddingHorizontal: 6,
        alignItems: "center", marginHorizontal: 2,
    },
    obsText: { fontSize: 11, fontWeight: "bold" },
    actionButtons: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
    btnEditIcon: {
        backgroundColor: "#f0eeff", borderRadius: 8,
        padding: 6, marginRight: 4,
    },
    btnDeleteIcon: {
        backgroundColor: "#fce4e4", borderRadius: 8, padding: 6,
    },

    // Stats
    statsRow: {
        flexDirection: "row", marginTop: 14, gap: 8,
    },
    statCard: {
        flex: 1, backgroundColor: "#f8f9fe", borderRadius: 10,
        padding: 10, alignItems: "center", borderTopWidth: 3,
    },
    statLabel: { color: "#636e72", fontSize: 11, marginBottom: 4 },
    statValue: { fontSize: 13, fontWeight: "bold" },

    // Vide
    emptyContainer: { alignItems: "center", paddingVertical: 30 },
    emptyEmoji: { fontSize: 40, marginBottom: 8 },
    emptyText: { color: "#b2bec3", fontSize: 14 },

    // Graphique
    chartTitle: { fontSize: 16, fontWeight: "bold", color: "#2d3436", textAlign: "center" },
    chartSub: { fontSize: 12, color: "#b2bec3", textAlign: "center", marginTop: 2 },
    legendRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 16, flexWrap: "wrap" },
    legendItem: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
    legendText: { fontSize: 12, color: "#636e72" },

    // Toast
    toast: {
        position: "absolute", bottom: 40, left: 16, right: 16,
        flexDirection: "row", alignItems: "center", padding: 14,
        borderRadius: 12, borderLeftWidth: 4, elevation: 10,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, shadowRadius: 8, zIndex: 999,
    },
    toastIcon: { fontSize: 18, marginRight: 10 },
    toastText: { color: "#fff", fontSize: 14, fontWeight: "600", flex: 1 },

    // Modal
    modalOverlay: {
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(45,52,54,0.6)",
        justifyContent: "center", alignItems: "center", zIndex: 998,
    },
    modalBox: {
        backgroundColor: "#fff", borderRadius: 20, padding: 28,
        marginHorizontal: 30, alignItems: "center", elevation: 20,
        shadowColor: "#6c5ce7", shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2, shadowRadius: 16,
    },
    modalIconContainer: {
        backgroundColor: "#fce4e4", borderRadius: 50,
        width: 70, height: 70, justifyContent: "center", alignItems: "center",
        marginBottom: 14,
    },
    modalIcon: { fontSize: 32 },
    modalTitle: { fontSize: 19, fontWeight: "bold", color: "#2d3436", marginBottom: 6 },
    modalMessage: { fontSize: 14, color: "#636e72", textAlign: "center", marginBottom: 24, lineHeight: 20 },
    modalButtons: { flexDirection: "row", gap: 10, width: "100%" },
    modalBtnCancel: {
        flex: 1, borderWidth: 1.5, borderColor: "#dfe6e9",
        padding: 13, borderRadius: 10, alignItems: "center",
    },
    modalBtnCancelText: { color: "#636e72", fontWeight: "600", fontSize: 15 },
    modalBtnConfirm: {
        flex: 1, backgroundColor: "#d63031",
        padding: 13, borderRadius: 10, alignItems: "center",
    },
    modalBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
})