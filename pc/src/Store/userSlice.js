import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";

export const loadUser = createAsyncThunk(
  "user/loadUser",
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) return rejectWithValue("未找到token");
      const decoded = jwtDecode(token);
      const role = decoded.role;

      if (!role) {
        return rejectWithValue("token信息不完整");
      }
      return role; // 返回角色
    } catch (error) {
      localStorage.removeItem("adminToken");
      return rejectWithValue("无效的token");
    }
  }
);

const userSlice = createSlice({
  name: "user",
  initialState: {
    role: null,
    status: "idle",
    error: null,
  },
  reducers: {
    clearUser: (state) => {
      state.role = null;
      state.status = "idle";
    },
  },
  extraReducers(builder) {
    builder
      .addCase(loadUser.pending, (state) => {
        state.status = "loading";
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.role = action.payload; // 直接存储角色
      })
      .addCase(loadUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        state.role = null;
      });
  },
});

export const { clearUser } = userSlice.actions;
export default userSlice.reducer;
