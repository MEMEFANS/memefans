import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
  Box,
  Grid
} from '@mui/material';

const GiveawayForm = ({ account }) => {
  const [giveawayData, setGiveawayData] = useState({
    tokenAmount: '',
    requireLike: true,
    requireRetweet: false,
    requireComment: false,
    duration: '24', // 持续时间（小时）
  });

  const handleChange = (event) => {
    const { name, value, checked } = event.target;
    setGiveawayData(prev => ({
      ...prev,
      [name]: event.target.type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      // 这里将来需要实现创建空投活动的逻辑
      console.log('Creating giveaway with data:', giveawayData);
      alert('Giveaway created successfully!');
    } catch (error) {
      console.error('Error creating giveaway:', error);
      alert('Failed to create giveaway. Please try again.');
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Create Token Giveaway
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Token Amount per User"
                name="tokenAmount"
                type="number"
                value={giveawayData.tokenAmount}
                onChange={handleChange}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Duration (hours)"
                name="duration"
                type="number"
                value={giveawayData.duration}
                onChange={handleChange}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Requirements
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={giveawayData.requireLike}
                    onChange={handleChange}
                    name="requireLike"
                  />
                }
                label="Like"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={giveawayData.requireRetweet}
                    onChange={handleChange}
                    name="requireRetweet"
                  />
                }
                label="Retweet"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={giveawayData.requireComment}
                    onChange={handleChange}
                    name="requireComment"
                  />
                }
                label="Comment"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
              >
                Create Giveaway
              </Button>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

export default GiveawayForm;
