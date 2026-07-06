import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

// 한글 폰트 없이 기본 폰트 사용 (Noto Sans는 별도 등록 필요)
const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: 'Helvetica', color: '#222' },
  title: { fontSize: 14, fontWeight: 'bold', color: '#014A99', marginBottom: 2 },
  subtitle: { fontSize: 9, color: '#888', marginBottom: 12 },
  divider: { borderBottomWidth: 2, borderBottomColor: '#014A99', marginBottom: 12 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  infoRow: { flexDirection: 'row', width: '50%', marginBottom: 4 },
  infoLabel: { color: '#888', width: 60 },
  infoValue: { fontWeight: 'bold', flex: 1 },
  infoRowFull: { flexDirection: 'row', width: '100%', marginBottom: 4 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#014A99', padding: '6 8', color: '#fff', fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', padding: '5 8', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tableRowAlt: { flexDirection: 'row', padding: '5 8', borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#f9f9f9' },
  colNo: { width: 24, textAlign: 'center' },
  colName: { flex: 1 },
  colPipe: { width: 40, textAlign: 'center' },
  colSleeve: { width: 40, textAlign: 'center' },
  colUnit: { width: 36, textAlign: 'center' },
  colQty: { width: 36, textAlign: 'center', fontWeight: 'bold' },
  footer: { marginTop: 24, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8, fontSize: 8, color: '#aaa', textAlign: 'center' },
})

interface Item {
  name: string
  spec?: string
  quantity: number
  unit?: string
  internalName?: string
}

interface OrderPdfProps {
  project?: string
  orderDate?: string
  deliveryDate?: string
  address?: string
  contactName?: string
  contactPhone?: string
  notes?: string
  vendor?: string
  items: Item[]
}

function parseSpec(spec: string) {
  const parts = (spec ?? '').split('*')
  if (parts.length === 2 && /^\d+$/.test(parts[0].trim()) && /^\d+$/.test(parts[1].trim())) {
    return { pipe: parts[0].trim(), sleeve: parts[1].trim() }
  }
  return { pipe: spec ?? '', sleeve: '' }
}

export function OrderPdfDocument({ project, orderDate, deliveryDate, address, contactName, contactPhone, notes, vendor, items }: OrderPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>발 주 서</Text>
        <Text style={styles.subtitle}>주식회사 탑디뉴스</Text>
        <View style={styles.divider} />

        <View style={styles.infoGrid}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>발주일자</Text>
            <Text style={styles.infoValue}>{orderDate ?? '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>납품요청일</Text>
            <Text style={styles.infoValue}>{deliveryDate ?? '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>현장명</Text>
            <Text style={styles.infoValue}>{project ?? '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>담당자</Text>
            <Text style={styles.infoValue}>{contactName ?? '-'}</Text>
          </View>
          <View style={styles.infoRowFull}>
            <Text style={styles.infoLabel}>주소</Text>
            <Text style={{ flex: 1 }}>{address ?? '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>연락처</Text>
            <Text style={styles.infoValue}>{contactPhone ?? '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>공급사</Text>
            <Text style={styles.infoValue}>{vendor ?? '-'}</Text>
          </View>
          {notes && (
            <View style={styles.infoRowFull}>
              <Text style={[styles.infoLabel, { color: '#d97706' }]}>요청사항</Text>
              <Text style={{ flex: 1, color: '#d97706' }}>{notes}</Text>
            </View>
          )}
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colNo}>No</Text>
          <Text style={styles.colName}>품명</Text>
          <Text style={styles.colPipe}>배관</Text>
          <Text style={styles.colSleeve}>슬리브</Text>
          <Text style={styles.colUnit}>단위</Text>
          <Text style={styles.colQty}>수량</Text>
        </View>
        {items.map((item, i) => {
          const { pipe, sleeve } = parseSpec(item.spec ?? '')
          const rowStyle = i % 2 === 0 ? styles.tableRow : styles.tableRowAlt
          return (
            <View key={i} style={rowStyle}>
              <Text style={styles.colNo}>{i + 1}</Text>
              <Text style={styles.colName}>{item.name}</Text>
              <Text style={styles.colPipe}>{pipe}</Text>
              <Text style={styles.colSleeve}>{sleeve}</Text>
              <Text style={styles.colUnit}>{item.unit || 'ea'}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
            </View>
          )
        })}

        <Text style={styles.footer}>탑디뉴스 · t) 010-9308-5358 · e) topdi@topdignus.co.kr</Text>
      </Page>
    </Document>
  )
}
