import { render } from '@testing-library/react-native';

import { ConfigurationErrorScreen } from '../ConfigurationErrorScreen';

describe('ConfigurationErrorScreen', () => {
  test('shows safe configuration guidance without rendering credentials', async () => {
    const view = await render(<ConfigurationErrorScreen issues={['EXPO_PUBLIC_SUPABASE_URL belum dikonfigurasi.']} />);
    view.getByText('Configuration Error');
    view.getByText('• EXPO_PUBLIC_SUPABASE_URL belum dikonfigurasi.');
    expect(view.queryByText(/eyJhbGci|service.role|xnd_/i)).toBeNull();
  });
});
