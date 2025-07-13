export const errorMessages = {
  required: (field: string) => `${field}は必須です`,
  minLength: (field: string, min: number) => `${field}は${min}文字以上で入力してください`,
  maxLength: (field: string, max: number) => `${field}は${max}文字以内で入力してください`,
  notExist: (field: string) => `選択した${field}は存在しません`,
  confirmPassword: () => `パスワードが一致しません`,
  passwordPolicy: () => `パスワードは半角数字・大文字・小文字・記号の混合で入力してください`,
  emailFormat: () => `メールアドレスの形式が正しくありません`,
};
