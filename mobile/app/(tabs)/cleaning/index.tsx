import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function CleaningBoardScreen() {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 20 }}>{t('cleaning.title')}</Text>
    </View>
  );
}
